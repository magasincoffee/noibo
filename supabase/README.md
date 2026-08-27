# MAGASIN NOIBO — Supabase migration

Supabase is the target backend for the GitHub Pages production frontend.

## Current project

- Project URL: `https://menvbzlsncmpuvnaifxa.supabase.co`
- Frontend-safe key: stored in `web/supabase-config.js`
- Database region: Northeast Asia (Seoul)

## Migration policy

1. Keep the existing Apps Script + Google Sheets system running during migration.
2. Do not migrate live data until the PostgreSQL schema is reviewed and approved.
3. Move authentication/session first.
4. Move operational modules incrementally: employees/roles → schedules → attendance → shift swaps → KPI → inventory → reports.
5. All database changes must be represented by SQL migrations in `supabase/migrations/`.
6. RLS is mandatory for production tables; do not expose new tables by default.

## Secret handling

`web/supabase-config.js` may contain the Supabase publishable key. Never put a database password, service-role key, secret key, or access token in `web/` or any GitHub-public file.
