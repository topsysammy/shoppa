-- Phase 5: sharing (PRD sections 6 and 7, H1, H3; sync rule 5).
--  - Invites: single list, expire after 7 days, validated on the server.
--    Tokens are 128-bit random, created only by the owner, rate limited.
--  - Joining works from a link opened in any browser; logged-out visitors
--    see a preview, sign up, then accept.
--  - Owner removes members; members can leave; owners delete instead.
--  - Co-members can see each other's display name and avatar tone.
--  - Item and member changes write activity rows for the feed (screen 45).

create extension if not exists pgcrypto;

-- Invites ------------------------------------------------------------------------

create table public.invites (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.lists (id) on delete cascade,
  token       text not null unique check (char_length(token) >= 20),
  created_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '7 days',
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index invites_list_idx on public.invites (list_id);
create index invites_creator_idx on public.invites (created_by, created_at desc);

alter table public.invites enable row level security;

-- Only the owner sees a list's invite links (Members screen 46).
create policy "invites: owner reads"
  on public.invites for select to authenticated
  using (public.is_list_owner(list_id));

-- All writes go through the functions below.
revoke insert, update, delete on public.invites from anon, authenticated;
revoke all on public.invites from anon;

-- Create (or reuse) the owner's active invite link. Rate limited to 20 new
-- links per user per hour (PRD section 8).
create or replace function public.create_invite(p_list_id uuid, p_force_new boolean default false)
returns table (token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_token text;
  v_expires timestamptz;
begin
  if not public.is_list_owner(p_list_id) then
    raise exception 'Only the list owner can invite people' using errcode = '42501';
  end if;
  if exists (select 1 from public.lists l where l.id = p_list_id and l.deleted_at is not null) then
    raise exception 'List not found' using errcode = 'P0002';
  end if;

  if p_force_new then
    update public.invites i set revoked_at = now()
    where i.list_id = p_list_id and i.revoked_at is null;
  else
    select i.token, i.expires_at into v_token, v_expires
    from public.invites i
    where i.list_id = p_list_id and i.revoked_at is null and i.expires_at > now() + interval '1 day'
    order by i.created_at desc
    limit 1;
    if v_token is not null then
      return query select v_token, v_expires;
      return;
    end if;
  end if;

  if (select count(*) from public.invites i where i.created_by = auth.uid() and i.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many invite links. Try again in an hour.' using errcode = 'P0001';
  end if;

  v_token := rtrim(translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/', '-_'), '=');
  insert into public.invites (list_id, token, created_by)
  values (p_list_id, v_token, auth.uid())
  returning invites.expires_at into v_expires;
  return query select v_token, v_expires;
end;
$$;

-- Disable every active link for a list (screen 46 "Disable", screen 39 "Reset link").
create or replace function public.revoke_invites(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_list_owner(p_list_id) then
    raise exception 'Only the list owner can manage invite links' using errcode = '42501';
  end if;
  update public.invites set revoked_at = now() where list_id = p_list_id and revoked_at is null;
end;
$$;

-- Screen 40 preview, available before sign-in (H3). Reveals only what the
-- inviter chose to share with the link holder: title, inviter, counts and
-- the first three items.
create or replace function public.invite_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_inv public.invites;
  v_list public.lists;
begin
  select * into v_inv from public.invites where token = p_token;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into v_list from public.lists where id = v_inv.list_id;
  if not found or v_list.deleted_at is not null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_inv.revoked_at is not null then
    return jsonb_build_object('status', 'revoked');
  end if;
  if v_inv.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'list_id', v_list.id,
    'title', v_list.title,
    'expires_at', v_inv.expires_at,
    'inviter', (select jsonb_build_object('name', p.display_name, 'tone', p.avatar_tone) from public.profiles p where p.id = v_inv.created_by),
    'member_count', (select count(*) from public.list_members m where m.list_id = v_list.id),
    'item_count', (select count(*) from public.items i where i.list_id = v_list.id and i.deleted_at is null),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('name', p.display_name, 'tone', p.avatar_tone) order by m.joined_at)
      from (select * from public.list_members where list_id = v_list.id order by joined_at limit 3) m
      join public.profiles p on p.id = m.user_id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.name, 'quantity', i.quantity, 'unit', i.unit) order by i.position)
      from (select * from public.items where list_id = v_list.id and deleted_at is null and purchased_at is null order by position limit 3) i
    ), '[]'::jsonb),
    'is_member', coalesce(auth.uid() is not null and exists (
      select 1 from public.list_members m where m.list_id = v_list.id and m.user_id = auth.uid()
    ), false)
  );
end;
$$;

-- Accept an invite (sync rule 5: checked on the server). Returns the list id.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.invites;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join' using errcode = '42501';
  end if;
  select * into v_inv from public.invites where token = p_token;
  if not found
     or v_inv.revoked_at is not null
     or v_inv.expires_at <= now()
     or exists (select 1 from public.lists l where l.id = v_inv.list_id and l.deleted_at is not null) then
    raise exception 'This invitation is no longer available' using errcode = 'P0002';
  end if;
  insert into public.list_members (list_id, user_id, role)
  values (v_inv.list_id, auth.uid(), 'member')
  on conflict (list_id, user_id) do nothing;
  return v_inv.list_id;
end;
$$;

revoke execute on function public.create_invite(uuid, boolean) from anon;
revoke execute on function public.revoke_invites(uuid) from anon;
revoke execute on function public.accept_invite(text) from anon;
grant execute on function public.invite_preview(text) to anon, authenticated;

-- Members: remove and leave ------------------------------------------------------

grant delete on public.list_members to authenticated;

create policy "list_members: owner removes members"
  on public.list_members for delete to authenticated
  using (public.is_list_owner(list_id) and role <> 'owner');

create policy "list_members: member leaves"
  on public.list_members for delete to authenticated
  using (user_id = (select auth.uid()) and role <> 'owner');

-- Profiles: co-members can see name and avatar tone ---------------------------------

create or replace function public.shares_list_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.list_members a
    join public.list_members b on b.list_id = a.list_id
    where a.user_id = (select auth.uid()) and b.user_id = p_other
  );
$$;

revoke execute on function public.shares_list_with(uuid) from anon;

create policy "profiles: co-members read"
  on public.profiles for select to authenticated
  using (public.shares_list_with(id));

-- Activity from server-side changes ---------------------------------------------------

alter table public.activity drop constraint if exists activity_type_check;
alter table public.activity add constraint activity_type_check check (type in (
  'trip_started', 'trip_finished',
  'item_added', 'item_purchased', 'item_updated', 'item_deleted',
  'member_joined', 'member_left', 'member_removed',
  'list_shared', 'list_renamed'
));

create or replace function public.log_activity(p_list uuid, p_type text, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity (list_id, type, payload)
  select p_list, p_type, p_payload
  where exists (select 1 from public.lists l where l.id = p_list);
$$;

revoke execute on function public.log_activity(uuid, text, jsonb) from anon, authenticated;

create or replace function public.items_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb := jsonb_build_object('item_id', new.id, 'name', new.name, 'quantity', new.quantity, 'unit', new.unit);
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.list_id, 'item_added', v);
  elsif old.deleted_at is null and new.deleted_at is not null then
    perform public.log_activity(new.list_id, 'item_deleted', v);
  elsif old.purchased_at is null and new.purchased_at is not null then
    perform public.log_activity(new.list_id, 'item_purchased', v);
  elsif new.deleted_at is null and (old.name, old.quantity, old.unit) is distinct from (new.name, new.quantity, new.unit) then
    perform public.log_activity(new.list_id, 'item_updated', v);
  end if;
  return null;
end;
$$;

create trigger items_activity
  after insert or update on public.items
  for each row execute function public.items_activity();

create or replace function public.lists_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.title is distinct from new.title then
    perform public.log_activity(new.id, 'list_renamed', jsonb_build_object('from', old.title, 'to', new.title));
  end if;
  return null;
end;
$$;

create trigger lists_activity
  after update on public.lists
  for each row execute function public.lists_activity();

create or replace function public.members_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.role = 'member' then
    perform public.log_activity(new.list_id, 'member_joined', jsonb_build_object('user_id', new.user_id));
  elsif tg_op = 'DELETE' then
    perform public.log_activity(
      old.list_id,
      case when old.user_id = auth.uid() then 'member_left' else 'member_removed' end,
      jsonb_build_object('user_id', old.user_id)
    );
  end if;
  return null;
end;
$$;

create trigger members_activity
  after insert or delete on public.list_members
  for each row execute function public.members_activity();

-- Realtime for membership changes is already published (migration 2).
