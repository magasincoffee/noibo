const test = require('node:test');
const assert = require('node:assert/strict');
const { generate, validateDraft, HARD } = require('../src');

function baseInput(overrides = {}) {
  return {
    week_start: '2026-08-24', week_end: '2026-08-30',
    profiles: [
      { id: 'u1', username: 'anna', status: 'ACTIVE', access_scope: 'STORE1' },
      { id: 'u2', username: 'ben', status: 'ACTIVE', access_scope: 'STORE1' },
    ],
    stores: [{ id: 's1', code: 'STORE1', status: 'ACTIVE' }],
    employee_grades: [{ user_id: 'u1', hourly_rate: 100 }, { user_id: 'u2', hourly_rate: 120 }],
    employee_constraints: [
      { user_id: 'u1', max_daily_hours: 8, max_weekly_hours: 20, min_rest_hours: 0, can_work_alone: true, mentor_required: false, preferred_store_id: 's1', allowed_store_ids: ['s1'] },
      { user_id: 'u2', max_daily_hours: 8, max_weekly_hours: 20, min_rest_hours: 0, can_work_alone: true, mentor_required: false, preferred_store_id: 's1', allowed_store_ids: ['s1'] },
    ],
    employee_availability: [
      { id: 'a1', user_id: 'u1', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', availability_type: 'AVAILABLE' },
      { id: 'a2', user_id: 'u2', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', availability_type: 'AVAILABLE' },
    ],
    employee_skills: [
      { user_id: 'u1', skill_code: 'BARISTA', level: 3, can_mentor: true, can_work_alone: true, status: 'ACTIVE' },
      { user_id: 'u2', skill_code: 'BARISTA', level: 2, can_mentor: false, can_work_alone: true, status: 'ACTIVE' },
    ],
    staffing_requirements: [{ id: 'r1', store_id: 's1', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', skill_code: 'BARISTA', min_skill_level: 2, minimum_headcount: 1, target_headcount: 1, maximum_headcount: 1 }],
    work_schedules: [],
    ...overrides,
  };
}

test('deterministic output is stable', () => {
  const a = generate(baseInput());
  const b = generate(JSON.parse(JSON.stringify(baseInput())));
  assert.deepEqual(a.assignments, b.assignments);
  assert.equal(a.deterministic, true);
  assert.equal(a.published, false);
});

test('unavailable overlap wins', () => {
  const input = baseInput({ employee_availability: [
    { user_id: 'u1', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', availability_type: 'AVAILABLE' },
    { user_id: 'u1', work_date: '2026-08-24', start_time: '09:00', end_time: '10:00', availability_type: 'UNAVAILABLE' },
    { user_id: 'u2', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', availability_type: 'AVAILABLE' },
  ] });
  const draft = generate(input);
  assert.equal(draft.assignments[0].user_id, 'u2');
});

test('official overlap is rejected', () => {
  const draft = generate(baseInput({ work_schedules: [{ user_id: 'u1', store_id: 's1', work_date: '2026-08-24', start_time: '07:00', end_time: '09:00', status: 'APPROVED' }] }));
  assert.equal(draft.assignments[0].user_id, 'u2');
});

test('daily and weekly caps are enforced', () => {
  const input = baseInput({
    employee_availability: [
      { user_id: 'u1', work_date: '2026-08-24', start_time: '08:00', end_time: '16:00', availability_type: 'AVAILABLE' },
      { user_id: 'u1', work_date: '2026-08-25', start_time: '08:00', end_time: '16:00', availability_type: 'AVAILABLE' },
      { user_id: 'u2', work_date: '2026-08-24', start_time: '08:00', end_time: '16:00', availability_type: 'AVAILABLE' },
      { user_id: 'u2', work_date: '2026-08-25', start_time: '08:00', end_time: '16:00', availability_type: 'AVAILABLE' },
    ],
    staffing_requirements: [
      { id: 'r1', store_id: 's1', work_date: '2026-08-24', start_time: '08:00', end_time: '16:00', minimum_headcount: 1, target_headcount: 1, maximum_headcount: 1 },
      { id: 'r2', store_id: 's1', work_date: '2026-08-25', start_time: '08:00', end_time: '16:00', minimum_headcount: 1, target_headcount: 1, maximum_headcount: 1 },
    ],
    employee_constraints: [
      { user_id: 'u1', max_daily_hours: 8, max_weekly_hours: 8, min_rest_hours: 0, can_work_alone: true, mentor_required: false, preferred_store_id: 's1', allowed_store_ids: ['s1'] },
      { user_id: 'u2', max_daily_hours: 8, max_weekly_hours: 20, min_rest_hours: 0, can_work_alone: true, mentor_required: false, preferred_store_id: 's1', allowed_store_ids: ['s1'] },
    ],
  });
  const draft = generate(input);
  assert.equal(draft.assignments.filter(a => a.user_id === 'u1').length, 1);
  assert.equal(draft.assignments.filter(a => a.user_id === 'u2').length, 1);
});

test('minimum shortage is reported', () => {
  const draft = generate(baseInput({ profiles: [{ id: 'u1', status: 'ACTIVE', access_scope: 'STORE1' }], employee_constraints: [{ user_id: 'u1', max_daily_hours: 8, max_weekly_hours: 20, allowed_store_ids: ['s1'] }], employee_availability: [{ user_id: 'u1', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', availability_type: 'AVAILABLE' }], employee_skills: [] }));
  assert.equal(draft.unmet[0].code, HARD.MINIMUM_COVERAGE_SHORTAGE);
});

test('validateDraft detects mutation', () => {
  const input = baseInput();
  const draft = generate(input);
  const mutated = { ...draft, assignments: draft.assignments.map(a => ({ ...a, start_time: '00:00', end_time: '01:00' })) };
  const result = validateDraft(input, mutated);
  assert.equal(result.valid, false);
  assert.ok(result.violations.length > 0);
});
