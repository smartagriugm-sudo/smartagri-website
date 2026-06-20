-- Research assistant profiles + avatar storage. Run once in the Supabase SQL
-- editor (after conversations.sql). Row Level Security ties every row/file to
-- the signed-in user.

-- 1. Profile table (1:1 with auth.users) ------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null default '',
  preferred_name text not null default '',
  occupation     text not null default '',
  division       text not null default '',
  staff_id       text not null default '',
  title          text not null default 'Research Assistant',
  avatar_url     text,
  about_me       text not null default '',
  instructions   text not null default '',
  ai_model       text,
  ai_language    text not null default 'auto',     -- auto | English | Indonesian
  ai_style       text not null default 'balanced', -- balanced | concise | detailed
  updated_at     timestamptz not null default now()
);

-- Idempotent upgrades for installs created before these columns existed.
alter table public.profiles add column if not exists preferred_name text not null default '';
alter table public.profiles add column if not exists occupation text not null default '';
alter table public.profiles add column if not exists about_me text not null default '';
alter table public.profiles add column if not exists instructions text not null default '';

alter table public.profiles enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- 2. Auto-create a profile row on sign-up, and backfill existing users -------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id)
select id from auth.users on conflict (id) do nothing;

-- 3. Avatars storage bucket (public read, owner-only write) ------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar public read" on storage.objects;
create policy "avatar public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatar owner insert" on storage.objects;
create policy "avatar owner insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar owner update" on storage.objects;
create policy "avatar owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar owner delete" on storage.objects;
create policy "avatar owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
