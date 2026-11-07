-- Phase 4: activity (PRD section 7: id, list, actor, type, payload, created at).
-- Shopping Mode writes trip_started and trip_finished so other members can
-- watch a trip live (screen 37). Phase 5 adds the activity feed (screen 45)
-- and the remaining event types. Activity rows are append-only.

create table public.activity (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.lists (id) on delete cascade,
  actor_id    uuid default auth.uid() references auth.users (id) on delete set null,
  type        text not null check (type in (
                'trip_started', 'trip_finished',
                'item_added', 'item_purchased', 'item_deleted',
                'member_joined', 'member_left', 'member_removed',
                'list_shared', 'list_renamed'
              )),
  -- Client facts such as when an offline trip really started (ISO time).
  payload     jsonb not null default '{}'::jsonb check (pg_column_size(payload) <= 4096),
  created_at  timestamptz not null default now(),
  -- Pull cursor; same as created_at because rows never change.
  updated_at  timestamptz not null default now()
);

create index activity_list_idx on public.activity (list_id, created_at desc);
create index activity_updated_at_idx on public.activity (updated_at, id);

create or replace function public.activity_before_insert()
returns trigger
language plpgsql
as $$
begin
  new.actor_id := auth.uid();
  new.created_at := now();
  new.updated_at := new.created_at;
  return new;
end;
$$;

create trigger activity_before_insert
  before insert on public.activity
  for each row execute function public.activity_before_insert();

alter table public.activity enable row level security;

create policy "activity: members read"
  on public.activity for select to authenticated
  using (public.is_list_member(list_id));

create policy "activity: members write own"
  on public.activity for insert to authenticated
  with check (public.is_list_member(list_id));

-- Append-only: no update or delete for clients.
revoke update, delete on public.activity from anon, authenticated;
revoke all on public.activity from anon;

-- Purge with the rest of the soft-deleted data (keep 90 days of activity).
create or replace function public.purge_soft_deleted()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.items where deleted_at < now() - interval '30 days';
  delete from public.lists where deleted_at < now() - interval '30 days';
  delete from public.activity where created_at < now() - interval '90 days';
$$;

alter publication supabase_realtime add table public.activity;
