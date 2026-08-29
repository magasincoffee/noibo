-- Workforce V2 Phase 8 regression guards.
-- Run after the Workforce migrations are applied to the target Supabase database.
-- This file intentionally does not mutate production data.

DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef('public.validate_schedule_generation_v1(uuid)'::regprocedure)
    INTO v_def;

  ASSERT position('c_exists boolean' IN v_def) > 0,
    'Phase 8 validator must track employee_constraints existence explicitly';
  ASSERT position('skill_exists boolean' IN v_def) > 0,
    'Phase 8 validator must track skill lookup state explicitly';
  ASSERT position('if c_exists and c.max_daily_hours' IN lower(v_def)) > 0,
    'daily-hour validation must use c_exists';
  ASSERT position('if c_exists and c.max_weekly_hours' IN lower(v_def)) > 0,
    'weekly-hour validation must use c_exists';
  ASSERT position('if c_exists and c.min_rest_hours' IN lower(v_def)) > 0,
    'rest validation must use c_exists';
  ASSERT position('if c_exists and c.mentor_required' IN lower(v_def)) > 0,
    'mentor validation must use c_exists';
  ASSERT position('x.work_date + x.end_time' IN lower(v_def)) > 0,
    'rest validation must use a cross-date timeline';
  ASSERT position('if found and c.max_daily_hours' IN lower(v_def)) = 0,
    'daily-hour validation must not rely on PL/pgSQL FOUND';
  ASSERT position('if found and c.max_weekly_hours' IN lower(v_def)) = 0,
    'weekly-hour validation must not rely on PL/pgSQL FOUND';
  ASSERT position('if found and c.min_rest_hours' IN lower(v_def)) = 0,
    'rest validation must not rely on PL/pgSQL FOUND';
  ASSERT position('if found and c.mentor_required' IN lower(v_def)) = 0,
    'mentor validation must not rely on PL/pgSQL FOUND';
END $$;

-- Behavioral cases to execute against test fixtures:
-- 1. Employee with no constraints row: no daily/weekly/rest/mentor rule should be falsely activated.
-- 2. Employee with constraints but no matching skill: SKILL_NOT_QUALIFIED must be returned.
-- 3. Employee with mentor_required=true and no concurrent mentor: MENTOR_REQUIRED must be returned.
-- 4. Sunday late shift + Monday early shift: MIN_REST_NOT_MET must be returned when the gap is below the configured rest.
-- 5. REVIEWED generation with a newly-created official overlap: publish must return blocked/DRAFT and create no partial schedules.
