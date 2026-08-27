-- MAGASIN Data API grants for Supabase Auth migration.
-- RLS remains the authorization boundary.

grant select on table public.profiles to authenticated;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
