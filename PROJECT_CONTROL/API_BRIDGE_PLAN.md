# MAGASIN — API BRIDGE PLAN

## Current architecture
- GitHub Pages: `web/`
- Apps Script production backend: `backend/01..15`
- API bridge: `backend/16_API_Bridge.gs`
- Google Sheets: operational data layer

## Transport
GitHub frontend sends HTTP POST to the Apps Script Web App URL.
The request body is JSON and the browser request uses `Content-Type: text/plain;charset=utf-8` to avoid an OPTIONS preflight.

## Security
- Public actions are limited to health, login, registration, verification and password reset.
- Session actions require a valid `sessionToken` stored by the backend session module.
- The bridge uses an explicit action dispatcher; it does not execute arbitrary function names supplied by the browser.
- No password, API key, OAuth credential or secret belongs in `web/api-config.js`.

## Migration order
1. Deploy `16_API_Bridge.gs` to the same Apps Script project as the existing backend.
2. Obtain the deployed Web App `/exec` URL.
3. Put that URL in `web/api-config.js`.
4. Run `web/api-test.html` and verify `health`.
5. Wire real Login into `web/index.html`.
6. Migrate session/access and then Schedule → Attendance → remaining modules.

## Important
The existing Apps Script HTML Service frontend remains untouched during migration. `frontend/` stays as the current production UI until the GitHub frontend passes functional smoke tests.
