# CHANGELOG

## 2026-08-28 — WORKFORCE V2 PHASE 2 SCHEDULER DOMAIN RULES
- Added `docs/architecture/MAGASIN_SCHEDULER_RULES_V1.md` as the normative scheduler domain rulebook.
- Defined HARD, SOFT and DERIVED rule classes.
- Defined deterministic candidate ordering and coverage semantics.
- Defined availability, skill, mentor, store and hour constraints.
- Defined review/publish boundaries and machine-readable hard-block explanations.
- No scheduler engine, publish workflow, UI behavior or production data was changed.

## 2026-08-28 — WORKFORCE V2 PHASE 1 DATA MODEL
- Added `supabase/migrations/20260828001200_workforce_data_integrity_v1.sql` as an additive data-integrity hardening migration.
- Enforced Monday-Sunday generation boundaries with `week_end = week_start + 6`.
- Prevented generic staffing requirements from carrying a non-zero skill level without a skill code.
- Added `updated_at` maintenance for scheduler generation runs.
- Added scheduler-oriented indexes for availability, active skills, constraints, staffing requirements and generation assignments.
- Added explicit column comments documenting V1 Workforce semantics.
- No scheduler algorithm, review/publish workflow, UI behavior or production data was changed.

## 2026-08-27 — CLEAN GITHUB → APPS SCRIPT SYNC V2
- Replaced the previous merge-style synchronization model with an exact canonical project replacement model.
- Added `PROJECT_CONTROL/appsscript.json` as the canonical Apps Script manifest.
- Updated `backend/20_Đồng_bộ_GitHub.gs` to normalize Apps Script API file names correctly and rebuild the target project from GitHub `main` only.
- Added `previewDongBoGitHubSyncPlan()` to show additions, replacements and removals before a clean sync.
- Clean sync creates an Apps Script Version backup before `projects.updateContent`.
- Clean sync removes legacy/non-canonical Apps Script files instead of preserving them, preventing duplicate global declarations such as `USER_HEADERS`.
- Deployment remains a separate controlled step.

## 2026-08-27 — PHASE 2 AUTH / SESSION / ROLE
- Re-read the canonical project from `magasincoffee/noibo` → `main`.
- Confirmed GitHub-loaded Apps Script runtime and user-validated schedule write path.
- Upgraded `backend/05_Phiên_đăng_nhập.gs` so live sessions rehydrate current user status, role and access scope from the `Người dùng` Sheet.
- Upgraded `backend/07_Phân_quyền.gs` with canonical page permissions and capability keys for all four roles.
- Added `backend/19_Phase2_Auth_Session_Role_Test.gs` for non-destructive verification in Apps Script.
- Updated the dependency map and project status to reflect the production runtime path.
- Marked GitHub Pages bridge files as experimental/non-production.

## 2026-08-27 — INITIAL REPOSITORY NORMALIZATION
- Initialized canonical repository structure for `magasincoffee/noibo`.
- Added PROJECT_CONTROL manifest, project map and dependency map.
- Moved active backend/frontend source into canonical directories by file role.
- Kept exported/version-suffixed source names out of the canonical source paths.
- Added README and documentation folders.

## Working rule
Use GitHub `main` as source of truth. Use feature branches for larger changes and review before merging. Do not remove the Apps Script fallback until production smoke tests are complete.
