# Auth V3 controlled test

Production authentication is isolated in `web/auth-runtime-v2.js` so the login/register/recovery/reset handlers are syntax-tested independently of the HTML shell.

Required flows:
- Login username/email
- Register new account
- Forgot password email
- Password recovery reset
- Security password change
