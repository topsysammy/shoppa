-- Phase 2: profiles (PRD section 7: id, display name, avatar tone, default
-- list, unit system, theme). One row per auth user, created by trigger.
-- RLS: a user can read and update only their own profile. Members of shared
-- lists will be able to read each other's display name and avatar tone once
-- the members table exists (phase 5 migration).

create extension if not exists "pgcrypto";

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default '' check (char_length(display_name) <= 80),
  avatar_tone   text not null default 'ink'
                check (avatar_tone in ('ink', 'blue', 'peach', 'lavender', 'mint')),
  -- FK to public.lists is added in the phase 3 migration
  default_list_id uuid,
  unit_system   text not null default 'local' check (unit_system in ('local', 'metric')),
  theme         text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Shoppa user profile, one per auth.users row.';

-- Server time is the source of truth for last-write-wins (PRD section 7, rule 1).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile when a user signs up (email or Google). Display name
-- comes from sign-up metadata (display_name) or the Google profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tones text[] := array['ink', 'blue', 'peach', 'lavender', 'mint'];
begin
  insert into public.profiles (id, display_name, avatar_tone)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ), 80),
    tones[1 + floor(random() * array_length(tones, 1))::int]
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security (PRD section 8)
alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert or delete policies: rows are created by the trigger above and
-- removed by the auth.users cascade when an account is deleted (P10).
revoke insert, delete on public.profiles from anon, authenticated;
revoke all on public.profiles from anon;
