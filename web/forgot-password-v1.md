# Forgot-password flow

Production login uses `resolve_login_email(p_username)` then Supabase `resetPasswordForEmail` with redirect `https://magasincoffee.github.io/noibo/web/`. The login page handles `PASSWORD_RECOVERY` and provides a new-password form that calls `auth.updateUser({ password })`.
