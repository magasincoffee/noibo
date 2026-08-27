-- MAGASIN AUTH V1.1
-- Lets the existing MAGASIN username login form resolve to the
-- email used by Supabase Auth. It intentionally returns only the
-- matching auth email and never exposes passwords or auth tokens.

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
    and p.status = 'ACTIVE'
  limit 1;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;
