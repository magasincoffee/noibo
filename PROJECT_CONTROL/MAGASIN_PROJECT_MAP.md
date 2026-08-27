# MAGASIN PROJECT MAP

## System
MAGASIN internal operations WebApp running on Google Apps Script with Google Sheets as the operational data layer.

## Backend modules
01–15 are the main Google Apps Script modules. Module names are preserved from the current project architecture.

## Frontend partials
- `Index.html` — HTML shell
- `_styles.html` — global styles, responsive system and Drawer/header UI
- `_auth.html` — authentication state, role-based navigation and routing
- `_schedule.html` — employee schedule UI
- `_attendance.html` — attendance UI
- `_management.html` — management UI

## Current UI architecture
- Shared topbar/header
- Hamburger menu in the header
- Left off-canvas Drawer
- Role-based parent/child navigation
- Responsive desktop/mobile layout

## Schedule architecture
- Official current-week schedule shows approved schedules
- Employee registration targets the next 7-day week
- Time selection uses 30-minute increments
- Schedule colors are based on time periods
- Manager approval and direct assignment are supported by the schedule backend

## Source-of-truth rule
Use the canonical files in `backend/` and `frontend/` rather than version-suffixed exported copies.