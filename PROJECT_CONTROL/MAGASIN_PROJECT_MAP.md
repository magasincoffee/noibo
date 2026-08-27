# MAGASIN PROJECT MAP

## System
MAGASIN internal operations WebApp running on Google Apps Script with Google Sheets as the operational data layer.

## Source of truth
GitHub repository `magasincoffee/noibo` → branch `main` is the canonical source for backend and frontend code.

## Production runtime path
`15_Ứng_dụng_web.gs`
→ `/exec?source=github`
→ `18_GitHub_Frontend_Loader.gs`
→ raw files from `main/frontend/`
→ HtmlService
→ `google.script.run`
→ backend modules
→ canonical Google Spreadsheet

## Backend modules
01–15 are the main Google Apps Script modules. Module names are preserved from the current project architecture.

Additional runtime/control modules:
- `16_API_Bridge.gs` — legacy experimental HTTP API bridge; not production transport
- `17_GitHub_Bridge.gs` — legacy experimental iframe bridge; not production transport
- `18_GitHub_Frontend_Loader.gs` — current GitHub frontend loader
- `19_Phase2_Auth_Session_Role_Test.gs` — Phase 2 non-destructive verification helper
- `20_Đồng_bộ_GitHub.gs` — controlled GitHub → Apps Script project synchronization

## Frontend partials
- `Index.html` — HTML shell, login views, app shell and common header container
- `_styles.html` — global styles, responsive system and Drawer/header UI
- `_auth.html` — authentication state, session restore, role navigation and routing
- `_schedule.html` — employee schedule UI
- `_attendance.html` — attendance UI
- `_management.html` — management UI
- `_phase2_ui_fix.html` — Phase 2 session/reload/logout UI fix

## Current UI architecture
- Shared topbar/header
- Hamburger menu in the header
- Left off-canvas Drawer
- Role-based parent/child navigation
- Responsive desktop/mobile layout

## Authentication / session / authorization architecture
- Login and registration: module 03
- Password recovery: module 04
- Session cache and live user rehydration: module 05
- Employee profile: module 06
- Role/page/capability policy: module 07
- User administration: module 08
- Frontend navigation: `_auth.html`

Phase 2 hardening rule:
- Session status, role and access scope are re-read from the canonical `Người dùng` Sheet for protected backend calls.
- Backend permission checks remain the security boundary; client-side menu visibility is a UX layer only.

## Schedule architecture
- Official current-week schedule shows approved schedules
- Employee registration targets the next 7-day week
- Time selection uses 30-minute increments
- Schedule colors are based on time periods
- Manager approval and direct assignment are supported by the schedule backend
- Attendance reads approved schedule information for planned shifts

## GitHub → Apps Script synchronization
- `20_Đồng_bộ_GitHub.gs` reads canonical `backend/` and `frontend/` files from GitHub `main`.
- Sync first reads the current Apps Script project and creates a Version API backup.
- Sync merges/replaces only the allowlisted canonical files and preserves other existing Apps Script files.
- Sync does **not** automatically deploy a new production version.
- Required one-time setup: enable Apps Script API and add OAuth scope `https://www.googleapis.com/auth/script.projects`.
- Daily safe flow: `testDongBoGitHub()` → `previewDongBoGitHub()` → `dongBoGitHubSangAppsScript()` → smoke test → deploy.
- `projects.updateContent` replaces the project's HEAD content, so the sync engine intentionally preserves all existing non-canonical files before update.

## Source-of-truth rule
Use the canonical files in `backend/` and `frontend/` rather than version-suffixed exported copies.

## Current phase
PHASE 2 — AUTH / SESSION / ROLE hardening + GitHub source synchronization setup

Live Apps Script deployment tests remain under user control.