-- Phase 6: notifications (N4, W5; PRD section 7 "Notification settings" and
-- "Push subscription").
--  - Activity on shared lists fans out to the other members' in-app inbox.
--  - Bursts are coalesced: "Mum added 2 items" is one row and one push.
--  - New inbox rows trigger the `push` Edge Function (Database Webhook, see
--    supabase/README.md), which honours each user's settings.

-- Settings: one row per user, toggles from Figma screen 56 -------------------

create table public.notification_settings (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  push_enabled      boolean not null default true,
  -- Someone joins a list you're on (link invites)
  invitations       boolean not null default true,
  -- Items added or edited by others, and finished trips
  list_activity     boolean not null default true,
  -- Live progress while someone shops your list
  shopping_updates  boolean not null default false,
  -- Weekly nudge about lists with items left (sending arrives later; see README)
  reminders         boolean not null default true,
  remind_day        smallint not null default 6 check (remind_day between 0 and 6),
  remind_time       time not null default '09:00',
  updated_at        timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

create policy "notification_settings: own"
  on public.notification_settings for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notification_settings: update own"
  on public.notification_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, delete on public.notification_settings from anon, authenticated;
revoke all on public.notification_settings from anon;

create trigger notification_settings_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- Every profile gets settings (existing users backfilled).
create or replace function public.profiles_add_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger profiles_add_settings
  after insert on public.profiles
  for each row execute function public.profiles_add_settings();

insert into public.notification_settings (user_id)
select id from public.profiles
on conflict do nothing;

-- Push subscriptions (Web Push, VAPID) -------------------------------------------

create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint      text not null unique check (endpoint like 'https://%'),
  p256dh        text not null,
  auth          text not null,
  user_agent    text check (char_length(user_agent) <= 400),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: own read"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "push_subscriptions: own add"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: own remove"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- A browser endpoint moves to whoever signs in on it last.
create policy "push_subscriptions: own update"
  on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.push_subscriptions from anon;

-- Register (or move) this browser's subscription to the signed-in user.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 400))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from anon;

-- In-app inbox (screen 51) ---------------------------------------------------------

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  list_id     uuid references public.lists (id) on delete cascade,
  actor_id    uuid references auth.users (id) on delete set null,
  type        text not null check (type in ('member_joined', 'items_added', 'items_purchased', 'trip_started', 'trip_finished')),
  count       integer not null default 1,
  payload     jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  pushed_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_updated_idx on public.notifications (updated_at, id);

alter table public.notifications enable row level security;

create policy "notifications: own read"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

-- Clients may only mark their own rows read.
create policy "notifications: own mark read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, delete on public.notifications from anon, authenticated;
revoke all on public.notifications from anon;

create or replace function public.notifications_guard()
returns trigger
language plpgsql
as $$
begin
  -- Only read_at can change from the client.
  if auth.role() = 'authenticated' and coalesce(current_setting('shoppa.fanout', true), '') <> '1' then
    new.user_id := old.user_id; new.list_id := old.list_id; new.actor_id := old.actor_id;
    new.type := old.type; new.count := old.count; new.payload := old.payload;
    new.pushed_at := old.pushed_at; new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger notifications_guard
  before update on public.notifications
  for each row execute function public.notifications_guard();

-- Fan-out: activity on a list -> inbox rows for the other members ------------------

create or replace function public.activity_fanout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text;
  v_member record;
  v_existing uuid;
  v_name text := new.payload ->> 'name';
begin
  v_type := case new.type
    when 'member_joined' then 'member_joined'
    when 'item_added' then 'items_added'
    when 'item_purchased' then 'items_purchased'
    when 'trip_started' then 'trip_started'
    when 'trip_finished' then 'trip_finished'
    else null
  end;
  if v_type is null then
    return null;
  end if;
  -- Lets the guard trigger allow the coalescing update below.
  perform set_config('shoppa.fanout', '1', true);

  for v_member in
    select m.user_id from public.list_members m
    where m.list_id = new.list_id and m.user_id is distinct from new.actor_id
  loop
    v_existing := null;
    -- Coalesce bursts from the same person on the same list (10 minutes).
    if v_type in ('items_added', 'items_purchased') then
      select n.id into v_existing
      from public.notifications n
      where n.user_id = v_member.user_id and n.list_id = new.list_id and n.type = v_type
        and n.actor_id is not distinct from new.actor_id and n.read_at is null
        and n.created_at > now() - interval '10 minutes'
      order by n.created_at desc
      limit 1;
    end if;

    if v_existing is not null then
      update public.notifications
      set count = count + 1,
          payload = jsonb_set(payload, '{names}', ((coalesce(payload -> 'names', '[]'::jsonb)) || to_jsonb(v_name)) ),
          updated_at = now()
      where id = v_existing;
    else
      insert into public.notifications (user_id, list_id, actor_id, type, payload)
      values (
        v_member.user_id, new.list_id, new.actor_id, v_type,
        new.payload || jsonb_build_object('names', case when v_name is null then '[]'::jsonb else jsonb_build_array(v_name) end)
      );
    end if;
  end loop;
  perform set_config('shoppa.fanout', '', true);
  return null;
end;
$$;

create trigger activity_fanout
  after insert on public.activity
  for each row execute function public.activity_fanout();

-- Keep the inbox tidy: drop notifications older than 60 days with the daily purge.
create or replace function public.purge_soft_deleted()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.items where deleted_at < now() - interval '30 days';
  delete from public.lists where deleted_at < now() - interval '30 days';
  delete from public.activity where created_at < now() - interval '90 days';
  delete from public.notifications where created_at < now() - interval '60 days';
$$;

alter publication supabase_realtime add table public.notifications;
