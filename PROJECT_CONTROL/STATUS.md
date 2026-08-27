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

## PHASE 2 — AUTH / SESSION / ROLE
### Code changes completed in GitHub
- `backend/05_Phiên_đăng_nhập.gs` upgraded to refresh session identity/status/role/accessScope from the current `Người dùng` Sheet.
- `backend/07_Phân_quyền.gs` upgraded with canonical page permissions and capability keys for STAFF, INVENTORY_MANAGER, STORE_MANAGER and OWNER.
- `backend/19_Phase2_Auth_Session_Role_Test.gs` added for safe Apps Script editor verification.

### Still requires user deployment/test
1. Copy updated module 05 to Apps Script.
2. Copy updated module 07 to Apps Script.
3. Copy module 19 to Apps Script.
4. Deploy a new Web App version.
5. Run `testPhase2AuthSessionRole()`.
6. Smoke-test staff login/session/logout.
7. Smoke-test manager/owner role visibility and access.
8. Test role/status change against an existing session.

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
