# Production login

`web/index.html` is the single entry point. It resolves username with `public.resolve_login_email`, signs in through Supabase Auth, then routes STAFF/EMPLOYEE to Employee V40 runtime and other active roles to the manager shell.