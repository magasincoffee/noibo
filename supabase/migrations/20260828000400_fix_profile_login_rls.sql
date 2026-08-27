-- MAGASIN Auth fix V1.2
-- Login only needs the authenticated user's own profile.
-- The previous profiles_select policy referenced public.stores through
-- can_access_store(), which could cause a permission error while PostgREST
-- evaluates the policy. Keep login/session profile access independent of stores.

alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.current_user_role() = 'OWNER'
);

grant select on table public.profiles to authenticated;

-- Keep the username -> email resolver available to the browser client.
grant execute on function public.resolve_login_email(text) to anon, authenticated;
