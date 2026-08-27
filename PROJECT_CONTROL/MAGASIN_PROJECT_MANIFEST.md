# MAGASIN PROJECT MANIFEST

## Repository
`magasincoffee/noibo`

## Role
Canonical source repository for the MAGASIN internal WebApp source and project-control documentation.

## Runtime
- Google Apps Script HTML Service — production runtime
- Google Apps Script backend — business logic
- Google Sheets — operational data layer
- Google Workspace ecosystem
- GitHub `main` — canonical source of backend/frontend code
- GitHub Pages under `web/` — preview / migration experiment only, not production runtime

## Canonical structure
- `PROJECT_CONTROL/` — project control, architecture state and versioning documents
- `backend/` — Google Apps Script `.gs` modules
- `frontend/` — canonical HTML/JS/CSS partials loaded by Apps Script
- `web/` — standalone frontend experiment / preview for GitHub Pages
- `docs/` — architecture, database and workflow documentation

## Current canonical frontend
- `frontend/Index.html`
- `frontend/_styles.html`
- `frontend/_auth.html`
- `frontend/_schedule.html`
- `frontend/_attendance.html`
- `frontend/_management.html`

## Apps Script GitHub loader
- `backend/18_GitHub_Frontend_Loader.gs`
- Runtime mode: `/exec?source=github`
- Source: `https://raw.githubusercontent.com/magasincoffee/noibo/main/frontend/`
- Apps Script assembles the six canonical frontend files and renders them with HTML Service.
- `google.script.run` remains the production client/server transport.

## Experimental GitHub Pages bridge
The following files are retained for reference only and are not the production transport:
- `web/api.js`
- `web/api-config.js`
- `web/api-test.html`
- `backend/16_API_Bridge.gs`
- `backend/17_GitHub_Bridge.gs`
- `bridge/Bridge.html`

Reason: the chosen production architecture avoids the cross-origin iframe/fetch bridge and keeps the application inside Apps Script HTML Service.

## Phase 2 status — AUTH / SESSION / ROLE
- Login wrong-password and correct-password tests: PASS (user-validated)
- Schedule registration write to Google Sheets: PASS (user-validated)
- Session storage: `sessionStorage` on browser + server-side `CacheService`
- Session rehydration: current Sheet status/role/scope is refreshed on protected backend calls
- Permission model: canonical page list + capability keys in `backend/07_Phân_quyền.gs`
- Phase 2 test helper: `backend/19_Phase2_Auth_Session_Role_Test.gs`

## Versioning rule
Files in canonical directories are the active source of truth. Historical snapshots, exported `.txt` copies and older versions must not silently replace canonical files.

## Security rule
Do not commit passwords, API keys, tokens, OAuth credentials, secrets or production personal data.

## Migration rule
Do not retire the current Apps Script deployment until the GitHub-loaded runtime passes the full authentication, authorization, schedule, attendance and production smoke-test suite.
