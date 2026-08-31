# MAGASIN Auth & Security V2

## Scope
Login, new account registration, forgot password, password reset, and authenticated password change.

## Flow
1. Login: username/email -> Supabase Auth -> active profile -> role router.
2. Register: Supabase Auth signUp with username/full_name/phone metadata -> DB trigger creates `profiles` as `PENDING` with role `STAFF` -> email verification -> manager approval before access.
3. Forgot password: `resetPasswordForEmail` -> production `/web/?auth=reset` -> `PASSWORD_RECOVERY` -> `updateUser({ password })` -> sign out -> login.
4. Security: authenticated user opens `Bảo mật`/`Cài đặt` -> `updateUser({ password })` without storing the old password.

## Authoritative backend
`resolve_login_email` maps an active username to the Supabase Auth email. The database schema stores profile identity/status/role, not password hashes from the legacy Apps Script system.

## Production verification checklist
- [ ] Login success/failure
- [ ] Register creates pending profile
- [ ] Email verification redirect
- [ ] Pending account blocked from application
- [ ] Forgot password email delivered
- [ ] Recovery session opens reset form
- [ ] Password reset succeeds
- [ ] New password login succeeds
- [ ] Security change password succeeds while authenticated
- [ ] Old password no longer authenticates
