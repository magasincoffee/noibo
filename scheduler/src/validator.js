const HARD = Object.freeze({
  EMPLOYEE_INACTIVE: 'EMPLOYEE_INACTIVE',
  STORE_NOT_ALLOWED: 'STORE_NOT_ALLOWED',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  UNAVAILABLE_OVERLAP: 'UNAVAILABLE_OVERLAP',
  EMPLOYEE_ASSIGNMENT_OVERLAP: 'EMPLOYEE_ASSIGNMENT_OVERLAP',
  DAILY_HOURS_LIMIT: 'DAILY_HOURS_LIMIT',
  WEEKLY_HOURS_LIMIT: 'WEEKLY_HOURS_LIMIT',
  MIN_REST_NOT_MET: 'MIN_REST_NOT_MET',
  SKILL_NOT_QUALIFIED: 'SKILL_NOT_QUALIFIED',
  MENTOR_REQUIRED: 'MENTOR_REQUIRED',
  MINIMUM_COVERAGE_SHORTAGE: 'MINIMUM_COVERAGE_SHORTAGE',
  MAXIMUM_COVERAGE_EXCEEDED: 'MAXIMUM_COVERAGE_EXCEEDED',
});

const SOFT = Object.freeze({
  TARGET_NOT_MET: 'TARGET_NOT_MET',
  PREFERRED_STORE_NOT_USED: 'PREFERRED_STORE_NOT_USED',
  PREFERRED_WINDOW_NOT_USED: 'PREFERRED_WINDOW_NOT_USED',
  WEEKLY_HOURS_IMBALANCE: 'WEEKLY_HOURS_IMBALANCE',
  STORE_CHANGE_PENALTY: 'STORE_CHANGE_PENALTY',
  SPLIT_ASSIGNMENT_PENALTY: 'SPLIT_ASSIGNMENT_PENALTY',
});

const EPS = 1e-9;

function arr(v) { return Array.isArray(v) ? v : []; }
function str(v) { return String(v ?? '').trim(); }
function minutes(v) {
  if (typeof v === 'number') return v;
  const m = /^(\d{1,2}):(\d{2})$/.exec(str(v));
  if (!m) throw new Error(`INVALID_TIME:${v}`);
  return Number(m[1]) * 60 + Number(m[2]);
}
function date(v) {
  const x = str(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) throw new Error(`INVALID_DATE:${v}`);
  return x;
}
function overlaps(a, b, c, d) { return a < d && c < b; }
function contains(a, b, c, d) { return a <= c && d <= b; }
function hours(a, b) { return (b - a) / 60; }

function context(input) {
  return {
    profiles: new Map(arr(input.profiles).map(p => [str(p.id), p])),
    stores: new Map(arr(input.stores).map(s => [str(s.id), s])),
    grades: new Map(arr(input.employee_grades).map(g => [str(g.user_id), g])),
    constraints: new Map(arr(input.employee_constraints).map(c => [str(c.user_id), c])),
    availability: arr(input.employee_availability).map(a => ({ ...a, user_id: str(a.user_id), work_date: date(a.work_date), start: minutes(a.start_time), end: minutes(a.end_time), availability_type: str(a.availability_type || 'AVAILABLE').toUpperCase() })),
    skills: arr(input.employee_skills).map(s => ({ ...s, user_id: str(s.user_id), skill_code: str(s.skill_code), level: Number(s.level ?? 0), status: str(s.status || 'ACTIVE').toUpperCase(), can_mentor: Boolean(s.can_mentor) })),
    requirements: arr(input.staffing_requirements).map(r => ({ ...r, id: str(r.id), store_id: str(r.store_id), work_date: date(r.work_date), start: minutes(r.start_time), end: minutes(r.end_time), skill_code: r.skill_code == null || r.skill_code === '' ? null : str(r.skill_code), min_skill_level: Number(r.min_skill_level ?? 0), minimum_headcount: Number(r.minimum_headcount ?? 0), target_headcount: Number(r.target_headcount ?? 0), maximum_headcount: Number(r.maximum_headcount ?? 0) })),
    official: arr(input.work_schedules).map(s => ({ ...s, user_id: str(s.user_id), store_id: str(s.store_id), work_date: date(s.work_date), start: minutes(s.start_time), end: minutes(s.end_time), status: str(s.status || 'APPROVED').toUpperCase() })),
  };
}
function employee(ctx, id) {
  const profile = ctx.profiles.get(id); const c = ctx.constraints.get(id);
  return profile && c ? { profile, ...c, user_id: id, allowed_store_ids: arr(c.allowed_store_ids).map(str), preferred_store_id: c.preferred_store_id == null ? null : str(c.preferred_store_id), grade: ctx.grades.get(id) } : null;
}
function storeAllowed(e, store) {
  if (!store || str(store.status).toUpperCase() !== 'ACTIVE') return false;
  if (e.allowed_store_ids.length) return e.allowed_store_ids.includes(str(store.id));
  const scope = str(e.profile.access_scope).toUpperCase(); if (!scope) return false;
  const tokens = scope.split(/[;,\s]+/).filter(Boolean); return tokens.includes('ALL') || tokens.includes(str(store.code).toUpperCase());
}
function skill(ctx, userId, code) { return ctx.skills.find(s => s.user_id === userId && s.skill_code === code && s.status === 'ACTIVE') || null; }
function availabilityCheck(ctx, e, a) {
  const rows = ctx.availability.filter(x => x.user_id === e.user_id && x.work_date === a.work_date);
  if (rows.some(x => x.availability_type === 'UNAVAILABLE' && overlaps(a.start, a.end, x.start, x.end))) return { ok: false, code: HARD.UNAVAILABLE_OVERLAP };
  if (!rows.some(x => ['AVAILABLE', 'PREFERRED'].includes(x.availability_type) && contains(x.start, x.end, a.start, a.end))) return { ok: false, code: HARD.NOT_AVAILABLE };
  return { ok: true };
}
function restCheck(assignments, userId, a, minRest) {
  if (!(Number(minRest) > 0)) return true;
  return assignments.filter(x => x.user_id === userId && x.work_date === a.work_date).every(x => {
    if (overlaps(x.start, x.end, a.start, a.end)) return false;
    const gap = x.end <= a.start ? a.start - x.end : x.start - a.end;
    return gap + EPS >= Number(minRest) * 60;
  });
}
function requirementCoverage(ctx, req, assignments) {
  const points = new Set([req.start, req.end]);
  assignments.filter(a => a.work_date === req.work_date && a.store_id === req.store_id && overlaps(a.start, a.end, req.start, req.end)).forEach(a => {
    points.add(Math.max(req.start, a.start)); points.add(Math.min(req.end, a.end));
  });
  const p = [...points].sort((a, b) => a - b); const slices = [];
  for (let i = 0; i < p.length - 1; i += 1) {
    const start = p[i], end = p[i + 1];
    if (start === end) continue;
    const active = assignments.filter(a => a.work_date === req.work_date && a.store_id === req.store_id && overlaps(a.start, a.end, start, end));
    const unique = new Set(active.map(a => a.user_id));
    const count = req.skill_code ? [...unique].filter(id => { const s = skill(ctx, id, req.skill_code); return s && s.level >= req.min_skill_level; }).length : unique.size;
    slices.push({ start, end, count });
  }
  return slices;
}
function add(violations, code, detail) { violations.push({ code, ...detail }); }
function validate(input, draft) {
  const ctx = context(input); const assignments = arr(draft?.assignments); const violations = []; const warnings = [];
  const seen = new Set();
  for (const a0 of assignments) {
    const a = { ...a0, user_id: str(a0.user_id), store_id: str(a0.store_id), work_date: date(a0.work_date), start: minutes(a0.start_time ?? a0.start), end: minutes(a0.end_time ?? a0.end) };
    if (a.end <= a.start) { add(violations, 'INVALID_INTERVAL', { assignment_key: a.assignment_key }); continue; }
    if (seen.has(a.assignment_key)) add(violations, 'DUPLICATE_ASSIGNMENT', { assignment_key: a.assignment_key });
    seen.add(a.assignment_key);
    const e = employee(ctx, a.user_id);
    if (!e || str(e.profile.status).toUpperCase() !== 'ACTIVE') { add(violations, HARD.EMPLOYEE_INACTIVE, { assignment_key: a.assignment_key }); continue; }
    if (!storeAllowed(e, ctx.stores.get(a.store_id))) add(violations, HARD.STORE_NOT_ALLOWED, { assignment_key: a.assignment_key });
    const av = availabilityCheck(ctx, e, a); if (!av.ok) add(violations, av.code, { assignment_key: a.assignment_key });
    if (ctx.official.some(s => s.user_id === a.user_id && ['APPROVED', 'PENDING'].includes(s.status) && s.work_date === a.work_date && overlaps(s.start, s.end, a.start, a.end))) add(violations, HARD.EMPLOYEE_ASSIGNMENT_OVERLAP, { assignment_key: a.assignment_key, source: 'OFFICIAL' });
    if (assignments.some(x => x !== a0 && str(x.user_id) === a.user_id && date(x.work_date) === a.work_date && overlaps(minutes(x.start_time ?? x.start), minutes(x.end_time ?? x.end), a.start, a.end))) add(violations, HARD.EMPLOYEE_ASSIGNMENT_OVERLAP, { assignment_key: a.assignment_key, source: 'DRAFT' });
    const sameDay = assignments.filter(x => str(x.user_id) === a.user_id && date(x.work_date) === a.work_date && x !== a0);
    const daily = sameDay.reduce((s, x) => s + hours(minutes(x.start_time ?? x.start), minutes(x.end_time ?? x.end)), 0) + hours(a.start, a.end);
    if (Number(e.max_daily_hours) > 0 && daily > Number(e.max_daily_hours) + EPS) add(violations, HARD.DAILY_HOURS_LIMIT, { assignment_key: a.assignment_key });
    const weekly = assignments.filter(x => str(x.user_id) === a.user_id).reduce((s, x) => s + hours(minutes(x.start_time ?? x.start), minutes(x.end_time ?? x.end)), 0);
    if (Number(e.max_weekly_hours) > 0 && weekly > Number(e.max_weekly_hours) + EPS) add(violations, HARD.WEEKLY_HOURS_LIMIT, { assignment_key: a.assignment_key });
    if (!restCheck(assignments.map(x => ({ ...x, user_id: str(x.user_id), work_date: date(x.work_date), start: minutes(x.start_time ?? x.start), end: minutes(x.end_time ?? x.end) })), a.user_id, a, e.min_rest_hours)) add(violations, HARD.MIN_REST_NOT_MET, { assignment_key: a.assignment_key });
    if (a.skill_code) { const s = skill(ctx, a.user_id, a.skill_code); if (!s || s.level < Number(a.skill_level ?? 0)) add(violations, HARD.SKILL_NOT_QUALIFIED, { assignment_key: a.assignment_key }); }
  }
  for (const req of ctx.requirements) {
    if (req.minimum_headcount < 0 || req.minimum_headcount > req.target_headcount || req.target_headcount > req.maximum_headcount) add(violations, 'INVALID_REQUIREMENT_HIERARCHY', { requirement_id: req.id });
    const slices = requirementCoverage(ctx, req, assignments);
    if (!slices.length || slices.some(x => x.count < req.minimum_headcount)) add(violations, HARD.MINIMUM_COVERAGE_SHORTAGE, { requirement_id: req.id });
    if (slices.some(x => x.count > req.maximum_headcount)) add(violations, HARD.MAXIMUM_COVERAGE_EXCEEDED, { requirement_id: req.id });
    if (slices.length && slices.some(x => x.count < req.target_headcount)) warnings.push({ code: SOFT.TARGET_NOT_MET, requirement_id: req.id });
  }
  const mentorRequired = assignments.filter(a => { const c = ctx.constraints.get(str(a.user_id)); return c?.mentor_required; });
  for (const a of mentorRequired) {
    if (!a.skill_code) { add(violations, HARD.MENTOR_REQUIRED, { assignment_key: a.assignment_key, reason: 'MISSING_SKILL_CONTEXT' }); continue; }
    const mentor = assignments.some(m => m !== a && m.store_id === a.store_id && m.work_date === a.work_date && overlaps(minutes(m.start_time ?? m.start), minutes(m.end_time ?? m.end), a.start, a.end) && (() => { const s = skill(ctx, str(m.user_id), a.skill_code); return s && s.level >= Number(a.skill_level ?? 0) && s.can_mentor; })());
    if (!mentor) add(violations, HARD.MENTOR_REQUIRED, { assignment_key: a.assignment_key });
  }
  return { valid: violations.length === 0, violations, warnings, counts: { assignments: assignments.length, violations: violations.length, warnings: warnings.length }, rule_version: draft?.rule_version || 'RULE_V1', timezone: draft?.timezone || 'Asia/Ho_Chi_Minh' };
}

module.exports = { HARD, SOFT, validate };
