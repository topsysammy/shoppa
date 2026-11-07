-- Phase 7: profile and settings (screens 53-65, P10).

-- Units (screen 59): Metric / Imperial plus the user's own quick units and
-- market measures. Replaces the phase 2 'local' | 'metric' column values.
alter table public.profiles drop constraint if exists profiles_unit_system_check;
update public.profiles set unit_system = 'metric' where unit_system not in ('metric', 'imperial');
alter table public.profiles alter column unit_system set default 'metric';
alter table public.profiles add constraint profiles_unit_system_check check (unit_system in ('metric', 'imperial'));

alter table public.profiles
  add column if not exists unit_prefs jsonb not null default
    '{"quick": ["piece", "pack", "bottle", "kg", "g", "litre", "ml", "box", "bag"], "market": ["mudu", "derica", "paint", "crate", "tuber", "congo", "bunch", "basket"]}'::jsonb
    check (pg_column_size(unit_prefs) <= 4096);

-- Profiles are edited offline and synced like lists: keep updated_at server-side.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- A user can't point default_list_id at a list they can't see.
create or replace function public.profiles_check_default_list()
returns trigger
language plpgsql
as $$
begin
  if new.default_list_id is not null and new.default_list_id is distinct from old.default_list_id
     and not public.is_list_member(new.default_list_id) then
    new.default_list_id := old.default_list_id;
  end if;
  return new;
end;
$$;

create trigger profiles_check_default_list
  before update on public.profiles
  for each row execute function public.profiles_check_default_list();

-- Ownership transfer on account deletion (screen 63 "Give ownership to Mum").
-- Clients still can't change owner_id; only the service role (the
-- delete-account Edge Function) can.
create or replace function public.lists_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.owner_id := coalesce(auth.uid(), new.owner_id);
  else
    if coalesce(auth.role(), '') <> 'service_role' then
      new.owner_id := old.owner_id;
    end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Account deletion summary for screen 63 (what will happen to each list).
create or replace function public.account_deletion_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'personal', (
      select count(*) from public.lists l
      where l.owner_id = auth.uid() and l.deleted_at is null
        and not exists (select 1 from public.list_members m where m.list_id = l.id and m.user_id <> auth.uid())
    ),
    'joined', coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title))
      from public.list_members m join public.lists l on l.id = m.list_id
      where m.user_id = auth.uid() and m.role = 'member' and l.deleted_at is null
    ), '[]'::jsonb),
    'shared_owned', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'title', l.title,
        'heir', (
          select jsonb_build_object('user_id', m.user_id, 'name', p.display_name)
          from public.list_members m join public.profiles p on p.id = m.user_id
          where m.list_id = l.id and m.user_id <> auth.uid()
          order by m.joined_at
          limit 1
        )
      ))
      from public.lists l
      where l.owner_id = auth.uid() and l.deleted_at is null
        and exists (select 1 from public.list_members m where m.list_id = l.id and m.user_id <> auth.uid())
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.account_deletion_summary() from anon;
