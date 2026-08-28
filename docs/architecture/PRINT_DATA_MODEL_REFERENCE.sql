-- MAGASIN PRINT DATA MODEL — REFERENCE ONLY
-- This file is NOT a production migration. Do not paste into Supabase SQL Editor
-- until the Print Agent protocol and security model are validated on hardware.

create table public.print_devices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  name text not null,
  status text not null default 'PENDING' check (status in ('PENDING','ONLINE','OFFLINE','DISABLED')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.printers (
  id uuid primary key default gen_random_uuid(),
  print_device_id uuid not null references public.print_devices(id) on delete cascade,
  name text not null,
  model text not null default 'HPRT TL31E',
  host text not null,
  port integer not null,
  mode text not null check (mode in ('LABEL','RECEIPT')),
  language text not null check (language in ('TSPL','ESC_POS')),
  paper_width_mm numeric,
  paper_height_mm numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  printer_id uuid not null references public.printers(id),
  requested_by uuid not null references auth.users(id),
  mode text not null check (mode in ('LABEL','RECEIPT')),
  language text not null check (language in ('TSPL','ESC_POS')),
  template text not null,
  copies integer not null default 1 check (copies between 1 and 100),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key uuid not null unique,
  status text not null default 'QUEUED' check (status in ('QUEUED','CLAIMED','PRINTING','PRINTED','FAILED','RETRY_WAIT','CANCELLED')),
  claimed_by uuid references public.print_devices(id),
  claimed_at timestamptz,
  printed_at timestamptz,
  retry_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index print_jobs_queue_idx
  on public.print_jobs (printer_id, status, created_at);

-- Production RLS policies must be designed against the actual MAGASIN role/scope
-- model before this reference becomes a migration.