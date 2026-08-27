# MAGASIN PROJECT STATUS

## Repository
`magasincoffee/noibo`

## Canonical branch
`main`

## Source of truth
GitHub `main` is the canonical source for backend and frontend code.

## Production runtime
Google Apps Script HTML Service + Google Apps Script backend + Google Sheets.

## Current runtime path
`/exec?source=github`
→ `18_GitHub_Frontend_Loader.gs`
→ `main/frontend/*`
→ HtmlService
→ `google.script.run`
→ MAGASIN backend
→ Google Sheets

## Completed and user-validated
- Repository structure normalized and merged to `main`.
- GitHub frontend source loading from Apps Script works.
- Login wrong-password rejection: PASS.
- Login correct-password success: PASS.
- Schedule registration writes to Google Sheets: PASS.
- Google Cloud project `MAGASIN NOIBO` configured and linked for Apps Script API access.
- `testDongBoGitHub()`: PASS.
- `previewDongBoGitHub()`: PASS; canonical source count reported as 27 files.
- `dongBoGitHubSangAppsScript()`: PASS; 27 canonical files synchronized into Apps Script and an Apps Script backup version was created before update.

## PHASE 2 — AUTH / SESSION / ROLE
### Code changes completed in GitHub
- `backend/05_Phiên_đăng_nhập.gs` upgraded to refresh session identity/status/role/accessScope from the current `Người dùng` Sheet.
- `backend/07_Phân_quyền.gs` upgraded with canonical page permissions and capability keys for STAFF, INVENTORY_MANAGER, STORE_MANAGER and OWNER.
- `backend/19_Phase2_Auth_Session_Role_Test.gs` added for safe Apps Script editor verification.
- `frontend/_phase2_ui_fix.html` added for session-restore, logout and saved-page UX fixes.

### User validation status
- Login success/failure: PASS.
- Schedule write through GitHub-loaded frontend: PASS.
- Logout and reload/page-restoration after the latest UI fix: PENDING final smoke test.
- Manager/owner role visibility and live role/status-change test: PENDING final smoke test.

## SOURCE SYNCHRONIZATION — COMPLETED
### Canonical sync module
`backend/20_Đồng_bộ_GitHub.gs`

### Current workflow
1. `testDongBoGitHub()` — verifies Apps Script API access.
2. `previewDongBoGitHub()` — reads canonical GitHub source without changing Apps Script.
3. `dongBoGitHubSangAppsScript()` — creates a backup version, merges canonical GitHub files into Apps Script, preserves non-canonical Apps Script files, and does not auto-deploy.

### Important operating rule
For canonical backend/frontend files, manual copy-paste is no longer required after GitHub changes. Run the sync function to update Apps Script from `main`. Deployment remains a separate controlled step until the production smoke-test suite is fully validated.

## Next phase after Phase 2
- Header + Drawer role-driven UI consolidation.
- Remove legacy static sidebar duplication from `frontend/Index.html`.
- Verify current-week official schedule vs next-week registration/approval.
- Verify approved schedule → attendance integration on desktop/mobile.

## Known incomplete business modules
- Inventory: backend stub only.
- Shift swap: employee submit/read only.
- KPI: employee read only.
- Reports: façade over attendance reporting.

## Working rule
Use GitHub `main` as source of truth. Use feature branches for larger changes. Do not remove the current Apps Script fallback until the full production smoke-test suite passes.
