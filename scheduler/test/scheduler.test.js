const test = require('node:test');
const assert = require('node:assert/strict');
const { generate } = require('../src');

function input(overrides = {}) {
  return {
    week_start: '2026-08-24', week_end: '2026-08-30',
    profiles: [{ id: 'u1', status: 'ACTIVE', access_scope: 'STORE1' }, { id: 'u2', status: 'ACTIVE', access_scope: 'STORE1' }],
    stores: [{ id: 's1', code: 'STORE1', status: 'ACTIVE' }],
    employee_grades: [{ user_id: 'u1', hourly_rate: 100 }, { user_id: 'u2', hourly_rate: 120 }],
    employee_constraints: [
      { user_id: 'u1', max_daily_hours: 8, max_weekly_hours: 20, min_rest_hours: 0, allowed_store_ids: ['s1'], preferred_store_id: 's1' },
      { user_id: 'u2', max_daily_hours: 8, max_weekly_hours: 20, min_rest_hours: 0, allowed_store_ids: ['s1'], preferred_store_id: 's1' },
    ],
    employee_availability: [
      { user_id: 'u1', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', availability_type: 'AVAILABLE' },
      { user_id: 'u2', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', availability_type: 'AVAILABLE' },
    ],
    employee_skills: [],
    staffing_requirements: [{ id: 'r1', store_id: 's1', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', minimum_headcount: 1, target_headcount: 1, maximum_headcount: 1 }],
    work_schedules: [],
    ...overrides,
  };
}

test('generation is deterministic and draft-only', () => {
  const a = generate(input());
  const b = generate(JSON.parse(JSON.stringify(input())));
  assert.deepEqual(a.assignments, b.assignments);
  assert.equal(a.deterministic, true);
  assert.equal(a.published, false);
});

test('unavailable overlap excludes employee', () => {
  const draft = generate(input({ employee_availability: [
    { user_id: 'u1', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', availability_type: 'AVAILABLE' },
    { user_id: 'u1', work_date: '2026-08-24', start_time: '09:00', end_time: '10:00', availability_type: 'UNAVAILABLE' },
    { user_id: 'u2', work_date: '2026-08-24', start_time: '08:00', end_time: '12:00', availability_type: 'AVAILABLE' },
  ] }));
  assert.equal(draft.assignments[0].user_id, 'u2');
});

test('official overlapping schedule is excluded', () => {
  const draft = generate(input({ work_schedules: [{ user_id: 'u1', work_date: '2026-08-24', start_time: '07:00', end_time: '09:00', status: 'APPROVED' }] }));
  assert.equal(draft.assignments[0].user_id, 'u2');
});

test('weekly cap forces distribution', () => {
  const draft = generate(input({
    employee_availability: [
      { user_id: 'u1', work_date: '2026-08-24', start_time: '08:00', end_time: '16:00', availability_type: 'AVAILABLE' },
      { user_id: 'u1', work_date: '2026-08-25', start_time: '08:00', end_time: '16:00', availability_type: 'AVAILABLE' },
      { user_id: 'u2', work_date: '2026-08-24', start_time: '08:00', end_time: '16:00', availability_type: 'AVAILABLE' },
      { user_id: 'u2', work_date: '2026-08-25', start_time: '08:00', end_time: '16:00', availability_type: 'AVAILABLE' },
    ],
    employee_constraints: [
      { user_id: 'u1', max_daily_hours: 8, max_weekly_hours: 8, allowed_store_ids: ['s1'] },
      { user_id: 'u2', max_daily_hours: 8, max_weekly_hours: 20, allowed_store_ids: ['s1'] },
    ],
    staffing_requirements: [
      { id: 'r1', store_id: 's1', work_date: '2026-08-24', start_time: '08:00', end_time: '16:00', minimum_headcount: 1, target_headcount: 1, maximum_headcount: 1 },
      { id: 'r2', store_id: 's1', work_date: '2026-08-25', start_time: '08:00', end_time: '16:00', minimum_headcount: 1, target_headcount: 1, maximum_headcount: 1 },
    ],
  }));
  assert.equal(draft.assignments.filter(a => a.user_id === 'u1').length, 1);
  assert.equal(draft.assignments.filter(a => a.user_id === 'u2').length, 1);
});

test('minimum rest is enforced across Sunday to Monday', () => {
  const draft = generate(input({
    employee_constraints: [
      { user_id: 'u1', max_daily_hours: 8, max_weekly_hours: 20, min_rest_hours: 8, allowed_store_ids: ['s1'], preferred_store_id: 's1' },
      { user_id: 'u2', max_daily_hours: 8, max_weekly_hours: 20, min_rest_hours: 8, allowed_store_ids: ['s1'], preferred_store_id: 's1' },
    ],
    employee_availability: [
      { user_id: 'u1', work_date: '2026-08-23', start_time: '20:00', end_time: '23:00', availability_type: 'AVAILABLE' },
      { user_id: 'u1', work_date: '2026-08-24', start_time: '04:00', end_time: '08:00', availability_type: 'AVAILABLE' },
      { user_id: 'u2', work_date: '2026-08-24', start_time: '04:00', end_time: '08:00', availability_type: 'AVAILABLE' },
    ],
    staffing_requirements: [
      { id: 'r1', store_id: 's1', work_date: '2026-08-23', start_time: '20:00', end_time: '23:00', minimum_headcount: 1, target_headcount: 1, maximum_headcount: 1 },
      { id: 'r2', store_id: 's1', work_date: '2026-08-24', start_time: '04:00', end_time: '08:00', minimum_headcount: 1, target_headcount: 1, maximum_headcount: 1 },
    ],
  }));
  const monday = draft.assignments.find(a => a.requirement_id === 'r2');
  assert.equal(monday.user_id, 'u2');
});
