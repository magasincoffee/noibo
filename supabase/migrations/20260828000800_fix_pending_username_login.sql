-- MAGASIN Auth V1.3
-- A newly registered user is intentionally created with profile.status = PENDING.
-- The previous username resolver filtered status = ACTIVE, which made a valid
-- newly registered username appear to be non-existent after password recovery.
-- Resolve ACTIVE/PENDING accounts so the frontend can authenticate the password
-- and then present the correct account-state message. INACTIVE remains blocked.

create or replace function public.resolve_login_email(p_username text)
returns text
language sql
security definer
set search_path = public, auth
stable
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(trim(p.username)) = lower(trim(p_username))
    and p.status in ('ACTIVE', 'PENDING')
  limit 1;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;

comment on function public.resolve_login_email(text) is
  'Resolve MAGASIN username to Auth email for ACTIVE/PENDING users; INACTIVE users remain blocked.';
