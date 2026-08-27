-- MAGASIN NOIBO — Supabase PostgreSQL V1
-- Source-derived schema. No production data is imported by this migration.
-- Password/hash columns from Apps Script are intentionally NOT migrated.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'STAFF'
    check (role in ('STAFF','STORE_MANAGER','INVENTORY_MANAGER','OWNER')),
  status text not null default 'PENDING'
    check (status in ('ACTIVE','PENDING','INACTIVE')),
  access_scope text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  grade text not null,
  hourly_rate numeric(12,2) not null default 0 check (hourly_rate >= 0),
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE','INACTIVE')),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  start_time time not null,
  end_time time not null,
  store_id uuid not null references public.stores(id),
  user_id uuid not null references public.profiles(id),
  status text not null default 'PENDING'
    check (status in ('PENDING','APPROVED','CANCELLED')),
  approver_id uuid references public.profiles(id),
  approved_at timestamptz,
  note text,
  origin text not null default 'USER_REQUEST'
    check (origin in ('USER_REQUEST','MANAGER_ASSIGNED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  user_id uuid not null references public.profiles(id),
  store_id uuid not null references public.stores(id),
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'OPEN'
    check (status in ('OPEN','COMPLETED','DELETED','DELETED_BY_MANAGER')),
  late_minutes integer not null default 0 check (late_minutes >= 0),
  early_minutes integer not null default 0 check (early_minutes >= 0),
  note text,
  created_at timestamptz not null default now(),
  grade text,
  hourly_rate numeric(12,2) not null default 0 check (hourly_rate >= 0),
  hours_worked numeric(8,2) not null default 0 check (hours_worked >= 0),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  planned_start time,
  planned_end time,
  check (check_out is null or check_in is null or check_out >= check_in)
);

create table if not exists public.shift_swaps (
  id uuid primary key default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  requester_id uuid not null references public.profiles(id),
  current_shift text not null,
  requested_shift text not null,
  store_id uuid not null references public.stores(id),
  reason text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING','APPROVED','CANCELLED','REJECTED')),
  approver_id uuid references public.profiles(id),
  approved_at timestamptz,
  note text
);

create table if not exists public.kpi_records (
  id uuid primary key default gen_random_uuid(),
  period text not null,
  user_id uuid not null references public.profiles(id),
  store_id uuid not null references public.stores(id),
  target text not null,
  result text,
  weight numeric(8,2) not null default 0,
  score numeric(8,2) not null default 0,
  evaluator_id uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  note text
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_schedules_user_date on public.work_schedules(user_id, work_date);
create index if not exists idx_schedules_store_date on public.work_schedules(store_id, work_date);
create index if not exists idx_attendance_user_date on public.attendance(user_id, work_date);
create index if not exists idx_attendance_store_date on public.attendance(store_id, work_date);
create index if not exists idx_swaps_requester on public.shift_swaps(requester_id, requested_at desc);
create index if not exists idx_kpi_user_period on public.kpi_records(user_id, period);

 drop trigger if exists trg_stores_updated_at on public.stores;
create trigger trg_stores_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

 drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

 drop trigger if exists trg_employee_grades_updated_at on public.employee_grades;
create trigger trg_employee_grades_updated_at
before update on public.employee_grades
for each row execute function public.set_updated_at();

 drop trigger if exists trg_work_schedules_updated_at on public.work_schedules;
create trigger trg_work_schedules_updated_at
before update on public.work_schedules
for each row execute function public.set_updated_at();

-- Helper functions for RLS. They read the current user's profile server-side.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_access_scope()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select access_scope from public.profiles where id = auth.uid();
$$;

create or replace function public.can_access_store(target_store_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_scope text;
  v_code text;
begin
  v_role := public.current_user_role();
  if v_role = 'OWNER' then return true; end if;
  select access_scope into v_scope from public.profiles where id = auth.uid();
  select code into v_code from public.stores where id = target_store_id;
  if coalesce(trim(v_scope), '') = '' then return false; end if;
  if position('ALL' in upper(v_scope)) > 0 then return true; end if;
  return position(upper(v_code) in upper(replace(replace(v_scope, ',', ';'), ' ', ''))) > 0;
end;
$$;

-- Create a profile automatically when a new Supabase Auth user is created.
-- Role is intentionally forced to STAFF; elevation is an owner-side operation.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_full_name text;
  v_phone text;
begin
  v_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email,''), '@', 1));
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', v_username);
  v_phone := new.raw_user_meta_data ->> 'phone';

  insert into public.profiles (id, username, full_name, email, phone, role, status)
  values (new.id, v_username, v_full_name, new.email, v_phone, 'STAFF', 'PENDING')
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name,''), excluded.full_name),
    updated_at = now();

  return new;
end;
$$;

 drop trigger if exists trg_auth_user_profile on auth.users;
create trigger trg_auth_user_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.employee_grades enable row level security;
alter table public.work_schedules enable row level security;
alter table public.attendance enable row level security;
alter table public.shift_swaps enable row level security;
alter table public.kpi_records enable row level security;

-- Profiles: self-read; OWNER manages all; managers may read users in their scope.
 drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (
    public.current_user_role() = 'STORE_MANAGER'
    and exists (
      select 1 from public.stores s
      where public.can_access_store(s.id)
      and position(upper(s.code) in upper(replace(replace(profiles.access_scope, ',', ';'), ' ', ''))) > 0
    )
  )
);

 drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_update_owner on public.profiles
for update to authenticated
using (public.current_user_role() = 'OWNER')
with check (public.current_user_role() = 'OWNER');

-- Stores: authenticated users can read active stores; OWNER manages catalog.
 drop policy if exists stores_select on public.stores;
create policy stores_select on public.stores
for select to authenticated
using (status = 'ACTIVE' or public.current_user_role() = 'OWNER');

 drop policy if exists stores_owner_write on public.stores;
create policy stores_owner_write on public.stores
for all to authenticated
using (public.current_user_role() = 'OWNER')
with check (public.current_user_role() = 'OWNER');

-- Employee grades: self-read; OWNER/STORE_MANAGER can read within scope; OWNER writes.
 drop policy if exists employee_grades_select on public.employee_grades;
create policy employee_grades_select on public.employee_grades
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER')
);

 drop policy if exists employee_grades_owner_write on public.employee_grades;
create policy employee_grades_owner_write on public.employee_grades
for all to authenticated
using (public.current_user_role() = 'OWNER')
with check (public.current_user_role() = 'OWNER');

-- Work schedules: self + managers with store access + OWNER.
 drop policy if exists schedules_select on public.work_schedules;
create policy schedules_select on public.work_schedules
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

 drop policy if exists schedules_insert on public.work_schedules;
create policy schedules_insert on public.work_schedules
for insert to authenticated
with check (
  (user_id = auth.uid() and public.can_access_store(store_id))
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

 drop policy if exists schedules_update on public.work_schedules;
create policy schedules_update on public.work_schedules
for update to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
)
with check (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

-- Attendance: self + managers with store access + OWNER.
 drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

 drop policy if exists attendance_insert on public.attendance;
create policy attendance_insert on public.attendance
for insert to authenticated
with check (
  (user_id = auth.uid() and public.can_access_store(store_id))
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

 drop policy if exists attendance_update on public.attendance;
create policy attendance_update on public.attendance
for update to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
)
with check (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

-- Shift swaps: requester + managers with store access + OWNER.
 drop policy if exists shift_swaps_select on public.shift_swaps;
create policy shift_swaps_select on public.shift_swaps
for select to authenticated
using (
  requester_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

 drop policy if exists shift_swaps_insert on public.shift_swaps;
create policy shift_swaps_insert on public.shift_swaps
for insert to authenticated
with check (requester_id = auth.uid() and public.can_access_store(store_id));

 drop policy if exists shift_swaps_update on public.shift_swaps;
create policy shift_swaps_update on public.shift_swaps
for update to authenticated
using (
  public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
)
with check (
  public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

-- KPI: self-read; managers/OWNER read/write within scope.
 drop policy if exists kpi_select on public.kpi_records;
create policy kpi_select on public.kpi_records
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

 drop policy if exists kpi_manager_write on public.kpi_records;
create policy kpi_manager_write on public.kpi_records
for all to authenticated
using (
  public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
)
with check (
  public.current_user_role() = 'OWNER'
  or (public.current_user_role() = 'STORE_MANAGER' and public.can_access_store(store_id))
);

comment on table public.profiles is 'MAGASIN profile mirror for Supabase Auth; replaces public user metadata from Google Sheets.';
comment on table public.stores is 'MAGASIN store catalog derived from current Cửa hàng sheet.';
comment on table public.work_schedules is 'MAGASIN work schedule derived from current Lịch làm việc sheet.';
comment on table public.attendance is 'MAGASIN attendance derived from current Chấm công sheet.';
comment on table public.shift_swaps is 'MAGASIN shift swap requests derived from current Đổi ca sheet.';
comment on table public.kpi_records is 'MAGASIN KPI records derived from current KPI sheet.';
