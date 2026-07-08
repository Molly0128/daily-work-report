create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'member'));
  end if;
end $$;

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date not null,
  work_items text,
  completed_content text,
  progress_percent integer default 0,
  tomorrow_plan text,
  blockers text,
  status text not null default '進行中',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, report_date)
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.daily_reports enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_update_own_name" on public.profiles;
drop policy if exists "daily_reports_select_own_or_admin" on public.daily_reports;
drop policy if exists "daily_reports_insert_own_or_admin" on public.daily_reports;
drop policy if exists "daily_reports_update_own_or_admin" on public.daily_reports;
drop policy if exists "daily_reports_delete_admin" on public.daily_reports;

create policy "profiles_select_own_or_admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_admin" on public.profiles
for insert with check (public.is_admin());

create policy "profiles_update_admin" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());

create policy "daily_reports_select_own_or_admin" on public.daily_reports
for select using (user_id = auth.uid() or public.is_admin());

create policy "daily_reports_insert_own_or_admin" on public.daily_reports
for insert with check (user_id = auth.uid() or public.is_admin());

create policy "daily_reports_update_own_or_admin" on public.daily_reports
for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "daily_reports_delete_admin" on public.daily_reports
for delete using (public.is_admin());
