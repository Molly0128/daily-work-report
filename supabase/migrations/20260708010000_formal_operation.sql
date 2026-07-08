-- Formal operation upgrade. Safe to rerun; preserves existing data and old columns.
create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists active boolean not null default true;

alter table if exists public.profiles drop constraint if exists profiles_role_check;
alter table if exists public.profiles
  add constraint profiles_role_check check (role in ('instructor', 'admin', 'member'));

alter table if exists public.daily_reports add column if not exists work_items text;
alter table if exists public.daily_reports add column if not exists completed_content text;
alter table if exists public.daily_reports add column if not exists progress integer default 0;
alter table if exists public.daily_reports add column if not exists tomorrow_plan text;
alter table if exists public.daily_reports add column if not exists issue text;
alter table if exists public.daily_reports add column if not exists notes text;
alter table if exists public.daily_reports alter column work_title drop not null;
alter table if exists public.daily_reports alter column work_title set default '';

update public.daily_reports set
  work_items = coalesce(nullif(work_items, ''), work_title),
  completed_content = coalesce(nullif(completed_content, ''), completed_today),
  progress = coalesce(progress, progress_percent, 0),
  tomorrow_plan = coalesce(nullif(tomorrow_plan, ''), plan_tomorrow),
  issue = coalesce(nullif(issue, ''), blockers),
  notes = coalesce(nullif(notes, ''), note)
where coalesce(work_items, completed_content, tomorrow_plan, issue, notes) is null
   or (work_items = '' and coalesce(work_title, '') <> '')
   or (completed_content = '' and coalesce(completed_today, '') <> '')
   or (tomorrow_plan = '' and coalesce(plan_tomorrow, '') <> '')
   or (issue = '' and coalesce(blockers, '') <> '')
   or (notes = '' and coalesce(note, '') <> '');

alter table if exists public.daily_reports drop constraint if exists daily_reports_progress_check;
alter table if exists public.daily_reports add constraint daily_reports_progress_check check (progress between 0 and 100);
alter table if exists public.daily_reports drop constraint if exists daily_reports_status_check;
alter table if exists public.daily_reports add constraint daily_reports_status_check check (status in ('進行中', '已完成', '延期', '需協助'));
create unique index if not exists daily_reports_user_date_uidx on public.daily_reports(user_id, report_date);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_daily_reports_updated_at on public.daily_reports;
create trigger set_daily_reports_updated_at before update on public.daily_reports for each row execute function public.set_updated_at();

create index if not exists daily_reports_report_date_idx on public.daily_reports(report_date);
create index if not exists daily_reports_user_id_idx on public.daily_reports(user_id);
create index if not exists daily_reports_status_idx on public.daily_reports(status);
create index if not exists profiles_active_idx on public.profiles(active);
create index if not exists profiles_role_idx on public.profiles(role);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action text not null,
  target_user_id uuid,
  target_email text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_manager(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p where p.id = check_user_id and p.role in ('instructor','admin') and p.active = true);
$$;
create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_manager(check_user_id);
$$;

alter table public.profiles enable row level security;
alter table public.daily_reports enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_managers_all_members_self" on public.profiles;
drop policy if exists "profiles_update_managers_all" on public.profiles;
drop policy if exists "profiles_update_member_self_basic" on public.profiles;
create policy "profiles_select_managers_all_members_self" on public.profiles for select using (public.is_manager() or id = auth.uid());
create policy "profiles_update_managers_all" on public.profiles for update using (public.is_manager()) with check (public.is_manager());
create policy "profiles_update_member_self_basic" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()) and active = (select active from public.profiles where id = auth.uid()));

drop policy if exists "daily_reports_select_manager_all_member_self" on public.daily_reports;
drop policy if exists "daily_reports_insert_member_self" on public.daily_reports;
drop policy if exists "daily_reports_update_manager_all_member_self" on public.daily_reports;
drop policy if exists "daily_reports_delete_manager" on public.daily_reports;
create policy "daily_reports_select_manager_all_member_self" on public.daily_reports for select using (public.is_manager() or user_id = auth.uid());
create policy "daily_reports_insert_member_self" on public.daily_reports for insert with check (user_id = auth.uid() and exists(select 1 from public.profiles p where p.id = auth.uid() and p.active = true));
create policy "daily_reports_update_manager_all_member_self" on public.daily_reports for update using (public.is_manager() or user_id = auth.uid()) with check (public.is_manager() or user_id = auth.uid());
create policy "daily_reports_delete_manager" on public.daily_reports for delete using (public.is_manager());

drop policy if exists "audit_logs_select_managers" on public.audit_logs;
create policy "audit_logs_select_managers" on public.audit_logs for select using (public.is_manager());
