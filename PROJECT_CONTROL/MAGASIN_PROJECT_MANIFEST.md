# MAGASIN PROJECT MANIFEST

## Repository
`magasincoffee/noibo`

## Role
Canonical source repository for the MAGASIN internal WebApp source and project-control documentation.

## Runtime
- Google Apps Script HTML Service (current/legacy UI runtime)
- Google Apps Script backend
- Google Sheets operational data layer
- Google Workspace ecosystem
- GitHub Pages frontend migration target under `web/`

## Canonical structure
- `PROJECT_CONTROL/` — project control and versioning documents
- `backend/` — Google Apps Script `.gs` modules
- `frontend/` — current HTML/JS/CSS partials for Apps Script HTML Service
- `web/` — standalone frontend target for GitHub Pages
- `docs/` — architecture, database and workflow documentation

## Current frontend baseline
- `frontend/Index.html`
- `frontend/_styles.html`
- `frontend/_auth.html`
- `frontend/_schedule.html`
- `frontend/_attendance.html`
- `frontend/_management.html`

## GitHub frontend migration
- `web/index.html` — standalone UI shell
- `web/api.js` — browser API client
- `web/api-config.js` — Apps Script Web App URL configuration placeholder
- `web/api-test.html` — health test page
- `backend/16_API_Bridge.gs` — Apps Script HTTP POST bridge

## Versioning rule
Files in canonical directories are the active source of truth. Historical snapshots, exported `.txt` copies and older versions must not silently replace canonical files.

## Security rule
Do not commit passwords, API keys, tokens, OAuth credentials, secrets or production personal data.

## Migration rule
Do not retire `frontend/` or the current Apps Script HTML Service deployment until the GitHub frontend passes authentication, session, authorization, schedule, attendance and production smoke tests.