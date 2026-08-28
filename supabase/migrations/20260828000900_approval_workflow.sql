-- MAGASIN NOIBO — Approval workflow V1
-- A verified/authenticated user may request access.
-- OWNERs review requests and activate profiles.
-- Approval requests are kept separately from profile.status so we retain audit history.

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'PENDING'
    check (status in ('PENDING','APPROVED','REJECTED','CANCELLED')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  note text
);

create index if not exists idx_approval_requests_user on public.approval_requests(user_id, requested_at desc);
create index if not exists idx_approval_requests_status on public.approval_requests(status, requested_at desc);

alter table public.approval_requests enable row level security;

drop policy if exists approval_requests_select on public.approval_requests;
create policy approval_requests_select on public.approval_requests
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'OWNER'
);

drop policy if exists approval_requests_insert on public.approval_requests;
create policy approval_requests_insert on public.approval_requests
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'PENDING'
  )
);

-- No direct UPDATE/DELETE policy is granted to the browser.
-- Review transitions are performed through the owner-only SECURITY DEFINER RPC below.

create or replace function public.submit_approval_request()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_request public.approval_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_profile.status = 'ACTIVE' then
    return jsonb_build_object('ok', true, 'status', 'ACTIVE', 'message', 'Tài khoản đã được kích hoạt.');
  end if;

  if not exists (
    select 1 from auth.users u
    where u.id = v_user_id
      and u.email_confirmed_at is not null
  ) then
    raise exception 'EMAIL_NOT_CONFIRMED';
  end if;

  select * into v_request
  from public.approval_requests
  where user_id = v_user_id
    and status = 'PENDING'
  order by requested_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'status', 'PENDING',
      'request_id', v_request.id,
      'requested_at', v_request.requested_at,
      'message', 'Yêu cầu duyệt của bạn đã được gửi và đang chờ quản lý xử lý.'
    );
  end if;

  insert into public.approval_requests (user_id)
  values (v_user_id)
  returning * into v_request;

  return jsonb_build_object(
    'ok', true,
    'status', 'PENDING',
    'request_id', v_request.id,
    'requested_at', v_request.requested_at,
    'message', 'Đã gửi yêu cầu duyệt. Vui lòng chờ quản lý kích hoạt tài khoản.'
  );
end;
$$;

grant execute on function public.submit_approval_request() to authenticated;

create or replace function public.get_my_approval_status()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'ok', true,
    'profile_status', coalesce(p.status, 'UNKNOWN'),
    'request', (
      select jsonb_build_object(
        'id', ar.id,
        'status', ar.status,
        'requested_at', ar.requested_at,
        'reviewed_at', ar.reviewed_at,
        'note', ar.note
      )
      from public.approval_requests ar
      where ar.user_id = auth.uid()
      order by ar.requested_at desc
      limit 1
    )
  )
  from public.profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.get_my_approval_status() to authenticated;

create or replace function public.list_pending_approval_requests()
returns table (
  id uuid,
  user_id uuid,
  requested_at timestamptz,
  username text,
  full_name text,
  email text,
  phone text,
  role text,
  profile_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'OWNER' then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    ar.id,
    ar.user_id,
    ar.requested_at,
    p.username,
    p.full_name,
    p.email,
    p.phone,
    p.role,
    p.status
  from public.approval_requests ar
  join public.profiles p on p.id = ar.user_id
  where ar.status = 'PENDING'
  order by ar.requested_at asc;
end;
$$;

grant execute on function public.list_pending_approval_requests() to authenticated;

create or replace function public.review_approval_request(
  p_request_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.approval_requests%rowtype;
  v_decision text := upper(trim(coalesce(p_decision, '')));
  v_reviewer uuid := auth.uid();
begin
  if public.current_user_role() <> 'OWNER' then
    raise exception 'FORBIDDEN';
  end if;

  if v_decision not in ('APPROVED','REJECTED') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_request
  from public.approval_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_request.status <> 'PENDING' then
    raise exception 'REQUEST_ALREADY_REVIEWED';
  end if;

  update public.approval_requests
  set status = v_decision,
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      note = nullif(trim(coalesce(p_note, '')), '')
  where id = p_request_id;

  if v_decision = 'APPROVED' then
    update public.profiles
    set status = 'ACTIVE',
        updated_at = now()
    where id = v_request.user_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'request_id', p_request_id,
    'decision', v_decision,
    'message', case
      when v_decision = 'APPROVED' then 'Đã duyệt tài khoản và kích hoạt quyền truy cập.'
      else 'Đã từ chối yêu cầu. Người dùng vẫn có thể gửi lại yêu cầu sau.'
    end
  );
end;
$$;

grant execute on function public.review_approval_request(uuid, text, text) to authenticated;

comment on table public.approval_requests is 'MAGASIN access approval workflow; separates approval history from profiles.status.';
comment on function public.submit_approval_request() is 'Authenticated verified users request manager approval; duplicate PENDING requests are prevented.';
comment on function public.review_approval_request(uuid, text, text) is 'OWNER-only approval decision; APPROVED activates the user profile.';
