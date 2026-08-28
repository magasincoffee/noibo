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
- `print-agent/` — local LAN print-agent prototype for HPRT TL31E validation

## Canonical Apps Script project manifest
- `PROJECT_CONTROL/appsscript.json`
- This file is the source copy of the Apps Script manifest used by the clean synchronization engine.
- It must remain free of passwords, API keys and other secrets.

## Current canonical frontend
- `frontend/Index.html`
- `frontend/_styles.html`
- `frontend/_auth.html`
- `frontend/_schedule.html`
- `frontend/_attendance.html`
- `frontend/_management.html`
- `frontend/_phase2_ui_fix.html`

## Apps Script GitHub loader
- `backend/18_GitHub_Frontend_Loader.gs`
- Runtime mode: `/exec?source=github`
- Source: `https://raw.githubusercontent.com/magasincoffee/noibo/main/frontend/`
- Apps Script assembles the canonical frontend files and renders them with HTML Service.
- `google.script.run` remains the production client/server transport.

## Experimental GitHub Pages bridge
The following files are retained in the repository for reference/development only and are not the production transport:
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

## Print integration — TL31E LAN prototype
- `docs/architecture/TL31E_PROTOCOL_FINDINGS.md` records verified facts and limits of protocol discovery.
- `docs/architecture/MAGASIN_PRINT_ARCHITECTURE.md` defines the proposed cloud-queue + local Print Agent topology.
- `docs/architecture/PRINT_DATA_MODEL_REFERENCE.sql` is reference-only and is not a production migration.
- `print-agent/` contains a local prototype with configurable raw-TCP transport, TSPL label generation, ESC/POS receipt generation, and a non-destructive TCP port probe.
- TL31E Ethernet/LAN configuration and TSPL/ESC/POS capabilities are verified from supplied documentation and HPRT material.
- Exact TL31E raw TCP port, discovery format and device-status protocol are **not yet proven**; `9100` in the example config is only a placeholder.
- Do not expose the Print Agent publicly and do not place service-role secrets in the browser or repository.
- No Supabase production print migration is included yet; hardware validation must happen first.

## Source synchronization
### Clean GitHub → Apps Script V2
- Synchronizer: `backend/20_Đồng_bộ_GitHub.gs`
- `testDongBoGitHub()` checks Apps Script API access.
- `previewDongBoGitHub()` builds the canonical project target without changing Apps Script.
- `previewDongBoGitHubSyncPlan()` compares current Apps Script content with the canonical target.
- `dongBoGitHubSangAppsScript()` backs up the current project and then replaces Apps Script HEAD with the exact canonical manifest + runtime files.
- The synchronizer does not merge or preserve unknown legacy Apps Script files.
- GitHub filenames are normalized to Apps Script API file names without `.gs`/`.html` extensions.
- The manifest is sent to Apps Script as `name: appsscript`, `type: JSON`.
- Deployment remains a separate controlled step.

## Versioning rule
Files in canonical directories are the active source of truth. Historical snapshots, exported `.txt` copies and older versions must not silently replace canonical files.

## Security rule
Do not commit passwords, API keys, tokens, OAuth credentials, secrets or production personal data.

## Migration rule
Do not retire the current Apps Script deployment until the GitHub-loaded runtime passes the full authentication, authorization, schedule, attendance and production smoke-test suite.
