# Forgot-password flow

Production login uses `resolve_login_email(p_username)` then Supabase `resetPasswordForEmail` with the production `/web/` URL as the recovery redirect. The login page must also handle `PASSWORD_RECOVERY` and expose a new-password form on the same page; otherwise the emailed link can return to the login page without a way to set the password.
