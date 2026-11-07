-- Phase 3: lists, list members and items (PRD section 7).
-- Sync rules implemented server-side:
--   1. Last write wins per field: clients send only the fields they changed;
--      updated_at is always set to the server's now() on arrival.
--   2. Purchased state is per item (purchased_at / purchased_by on each row),
--      so two people ticking different items never touch the same row.
--   3. Deletes are soft (deleted_at) and purged after 30 days.
-- Permissions (PRD section 7): members read, add, edit, tick and delete
-- items; only the owner renames, archives or deletes the list.

-- Lists ----------------------------------------------------------------------

create table public.lists (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(trim(title)) between 1 and 80),
  note         text not null default '' check (char_length(note) <= 500),
  -- Figma screen 20 "Type" and "Icon" (not in PRD v3 data model; flagged)
  kind         text not null default 'groceries' check (kind in ('groceries', 'household', 'party', 'business')),
  icon         text not null default 'bag' check (icon in ('bag', 'home', 'gift', 'leaf', 'broom', 'box')),
  archived_at  timestamptz,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index lists_updated_at_idx on public.lists (updated_at, id);
create index lists_owner_idx on public.lists (owner_id);

-- Members --------------------------------------------------------------------

create table public.list_members (
  list_id    uuid not null references public.lists (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index list_members_user_idx on public.list_members (user_id);

-- Items ----------------------------------------------------------------------

create table public.items (
  id            uuid primary key default gen_random_uuid(),
  list_id       uuid not null references public.lists (id) on delete cascade,
  name          text not null check (char_length(trim(name)) between 1 and 120),
  quantity      numeric(10, 2) check (quantity is null or quantity > 0),
  unit          text check (unit is null or char_length(unit) between 1 and 24),
  note          text not null default '' check (char_length(note) <= 500),
  purchased_at  timestamptz,
  purchased_by  uuid references auth.users (id) on delete set null,
  position      double precision not null default 0,
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index items_list_idx on public.items (list_id);
create index items_updated_at_idx on public.items (updated_at, id);

-- Membership helpers (security definer avoids RLS recursion) -----------------

create or replace function public.is_list_member(lid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.list_members m
    where m.list_id = lid and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_list_owner(lid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lists l
    where l.id = lid and l.owner_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_list_member(uuid) from anon;
revoke execute on function public.is_list_owner(uuid) from anon;

-- Triggers -------------------------------------------------------------------

-- Sync rule 1: the server's arrival time is the version. Immutable columns
-- are protected so a client patch cannot rewrite them.
create or replace function public.lists_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.owner_id := coalesce(auth.uid(), new.owner_id);
  else
    new.owner_id := old.owner_id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger lists_before_write
  before insert or update on public.lists
  for each row execute function public.lists_before_write();

create or replace function public.items_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  -- Sync rule 2: purchased_by follows purchased_at.
  if new.purchased_at is null then
    new.purchased_by := null;
  elsif tg_op = 'INSERT' or old.purchased_at is null then
    new.purchased_by := coalesce(new.purchased_by, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger items_before_write
  before insert or update on public.items
  for each row execute function public.items_before_write();

-- The owner becomes the first member of a new list.
create or replace function public.lists_add_owner_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.list_members (list_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger lists_add_owner_member
  after insert on public.lists
  for each row execute function public.lists_add_owner_member();

-- Row-level security -----------------------------------------------------------

alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.items enable row level security;

create policy "lists: members read"
  on public.lists for select to authenticated
  using (public.is_list_member(id) or owner_id = (select auth.uid()));

create policy "lists: create own"
  on public.lists for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "lists: owner updates"
  on public.lists for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- No delete policy: lists are soft-deleted by the owner (deleted_at).

create policy "list_members: members read"
  on public.list_members for select to authenticated
  using (public.is_list_member(list_id));

-- Joining and removing members is done by server functions in phase 5.

create policy "items: members read"
  on public.items for select to authenticated
  using (public.is_list_member(list_id));

create policy "items: members add"
  on public.items for insert to authenticated
  with check (public.is_list_member(list_id));

-- Members can edit, tick and soft-delete; moving an item requires membership
-- of the destination list too (checked by WITH CHECK on the new row).
create policy "items: members edit"
  on public.items for update to authenticated
  using (public.is_list_member(list_id))
  with check (public.is_list_member(list_id));

revoke delete on public.lists, public.items, public.list_members from anon, authenticated;
revoke insert, update on public.list_members from anon, authenticated;
revoke all on public.lists, public.items, public.list_members from anon;

-- Profiles: default list --------------------------------------------------------

alter table public.profiles
  add constraint profiles_default_list_fk
  foreign key (default_list_id) references public.lists (id) on delete set null;

-- Sync rule 3: purge soft-deleted rows after 30 days ------------------------------

create or replace function public.purge_soft_deleted()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.items where deleted_at < now() - interval '30 days';
  delete from public.lists where deleted_at < now() - interval '30 days';
$$;

revoke execute on function public.purge_soft_deleted() from anon, authenticated;

-- Schedule the purge daily when pg_cron is enabled (Database > Extensions).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('shoppa-purge-soft-deleted', '17 3 * * *', 'select public.purge_soft_deleted()');
  end if;
end;
$$;

-- Sync rule 6: realtime changes for open tabs ------------------------------------

alter publication supabase_realtime add table public.lists, public.items, public.list_members;
