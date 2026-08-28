# MAGASIN Workforce Scheduler V1

Deterministic planning engine for Workforce V2.

## Scope

The engine consumes normalized Workforce V2 inputs and returns a deterministic draft. It does not write Supabase, mutate `work_schedules`, publish schedules, or send notifications.

## Contract

- Business timezone: `Asia/Ho_Chi_Minh`.
- One generation is Monday-Sunday.
- Overnight intervals are rejected.
- Hard constraints are filtered before ranking.
- No random tie-breaking.
- Official schedule overlap is rejected.
- `UNAVAILABLE` overrides workable availability.
- Skill requirements use active skill rows and minimum level.
- Daily/weekly caps and minimum rest are enforced.
- Mentor-required trainees need a compatible concurrent mentor.
- Staffing coverage is evaluated over interval boundaries.
- Generation result is marked draft-only.

## API

```js
const { generate, validateDraft } = require('./src');

const draft = generate({
  week_start: '2026-08-24',
  week_end: '2026-08-30',
  profiles: [],
  stores: [],
  employee_grades: [],
  employee_constraints: [],
  employee_availability: [],
  employee_skills: [],
  staffing_requirements: [],
  work_schedules: [],
});

const validation = validateDraft(input, draft);
```

## Deliberate V1 limitation

The implementation uses a deterministic greedy assignment strategy. It is a first scheduler engine, not an optimization solver. Later phases can improve scoring/validation without changing the external generation contract.

## Verification

Run:

```bash
npm test
npm run check
```
