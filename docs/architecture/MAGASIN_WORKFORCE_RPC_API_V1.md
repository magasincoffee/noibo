# MAGASIN Workforce RPC/API V1

## Purpose

This document defines the Supabase RPC boundary for Workforce V2. The browser calls these functions through the Supabase client; base-table permissions remain an enforcement layer, not a UI convention.

## Employee availability

`save_my_availability(p_availability_id, p_work_date, p_start_time, p_end_time, p_availability_type, p_preferred_store_id, p_note) -> uuid`

Creates or updates one date-specific availability window. Employees may manage their own rows; OWNER may manage any row. `end_time > start_time` is required. `UNAVAILABLE` and `PREFERRED` are accepted V1 values.

`delete_my_availability(p_availability_id) -> boolean`

Deletes an availability row owned by the caller or by OWNER.

`get_my_availability(p_week_start) -> rows`

Returns the caller's availability for an optional Monday-Sunday window.

## Staffing demand

`get_workforce_staffing_requirements(p_store_id, p_week_start) -> rows`

Returns active/inactive staffing requirements only within the caller's authorized store scope. OWNER and STORE_MANAGER may read through the RPC.

`upsert_workforce_staffing_requirement(...) -> uuid`

Creates or updates staffing demand. The RPC enforces store scope, interval validity, skill level range and `minimum <= target <= maximum`. Generic requirements require `min_skill_level = 0`.

## Scheduler generation draft

`create_schedule_generation(p_store_id, p_week_start, p_algorithm_version) -> uuid`

Creates a `DRAFT` generation for a Monday-start week. No official schedule rows are modified.

`replace_schedule_generation_assignments(p_generation_id, p_assignments_jsonb) -> integer`

Atomically replaces assignments in a `DRAFT` generation after structural checks: generation status, week/store scope, active employee, interval validity and intra-generation employee overlap. It recalculates total hours.

`get_schedule_generation(p_generation_id) -> row`

Reads generation metadata within authorization scope.

`get_schedule_generation_assignments(p_generation_id) -> rows`

Reads assignment rows with employee/store display data, ordered deterministically.

`cancel_schedule_generation(p_generation_id) -> boolean`

Cancels a `DRAFT` generation. Official `work_schedules` are untouched.

## Deliberate boundary

PHẦN 5 does **not** expose `REVIEWED` or `PUBLISHED` transitions. Those transitions require the independent validation gate plus final transactional revalidation and belong to the later review/publish phase.

PHẦN 5 also does not execute the Node scheduler engine inside PostgreSQL. The deterministic engine remains a separate package; a later integration layer can pass its normalized draft into `replace_schedule_generation_assignments`.

## Security contract

All Workforce RPCs are `SECURITY DEFINER`, pin `search_path = public`, require an authenticated caller, and explicitly revoke execution from `anon` and `public`. Role and store scope are checked server-side using the existing profile/RLS helper functions.
