# MAGASIN PROJECT MANIFEST

## Repository
`magasincoffee/noibo`

## Role
Canonical source repository for the MAGASIN internal WebApp source and project-control documentation.

## Runtime
- Google Apps Script HTML Service
- Google Apps Script backend
- Google Sheets operational data layer
- Google Workspace ecosystem

## Canonical structure
- `PROJECT_CONTROL/` — project control and versioning documents
- `backend/` — Google Apps Script `.gs` modules
- `frontend/` — HTML/JS/CSS partials
- `docs/` — architecture, database and workflow documentation

## Current frontend baseline
- `Index.html`
- `_styles.html`
- `_auth.html`
- `_schedule.html`
- `_attendance.html`
- `_management.html`

## Versioning rule
Files in canonical directories are the active source of truth. Historical snapshots, exported `.txt` copies and older versions must not silently replace canonical files.

## Security rule
Do not commit passwords, API keys, tokens, OAuth credentials, secrets or production personal data.