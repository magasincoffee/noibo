const RULE_VERSION = 'RULE_V1';
const BUSINESS_TZ = 'Asia/Ho_Chi_Minh';

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

function arr(value) { return Array.isArray(value) ? value : []; }
function str(value) { return String(value ?? '').trim(); }
function date(value) {
  const v = str(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`INVALID_DATE:${v}`);
  return v;
}
function minutes(value) {
  const v = str(value);
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) throw new Error(`INVALID_TIME:${v}`);
  const h = Number(m[1]); const min = Number(m[2]);
  if (h > 23 || min > 59) throw new Error(`INVALID_TIME:${v}`);
  return h * 60 + min;
}
function timeText(v) { return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; }
function durationHours(a, b) { return (b - a) / 60; }
function overlaps(a, b, c, d) { return a < d && c < b; }
function contains(a, b, c, d) { return a <= c && d <= b; }
function mondayOfWeek(v) {
  const d = new Date(`${v}T12:00:00+07:00`);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
  return d.toISOString().slice(0, 10);
}
function plusDays(v, n) {
  const d = new Date(`${v}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function inWeek(v, start, end) { return v >= start && v <= end; }
function intervalKey(r) { return `${r.work_date}|${timeText(r.start)}|${timeText(r.end)}|${r.store_id}|${r.id}`; }

function normalize(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const weekStart = mondayOfWeek(date(input.week_start));
  if (date(input.week_start) !== weekStart) throw new Error('INVALID_WEEK_START_MUST_BE_MONDAY');
  const weekEnd = plusDays(weekStart, 6);
  if (input.week_end && date(input.week_end) !== weekEnd) throw new Error('INVALID_WEEK_RANGE');

  const profiles = new Map(arr(input.profiles).map(p => [str(p.id), { ...p, id: str(p.id) }]));
  const stores = new Map(arr(input.stores).map(s => [str(s.id), { ...s, id: str(s.id) }]));
  const grades = new Map(arr(input.employee_grades).map(g => [str(g.user_id), g]));
  const constraints = arr(input.employee_constraints).map(c => ({
    ...c,
    user_id: str(c.user_id),
    max_daily_hours: Number(c.max_daily_hours ?? 0),
    max_weekly_hours: Number(c.max_weekly_hours ?? 0),
    min_rest_hours: Number(c.min_rest_hours ?? 0),
    can_work_alone: Boolean(c.can_work_alone),
    mentor_required: Boolean(c.mentor_required),
    allowed_store_ids: arr(c.allowed_store_ids).map(str),
    preferred_store_id: c.preferred_store_id == null ? null : str(c.preferred_store_id),
  }));
  const employees = constraints.map(c => ({ ...c, profile: profiles.get(c.user_id), grade: grades.get(c.user_id) })).filter(e => e.profile);
  const availability = arr(input.employee_availability).map(a => ({
    ...a, id: str(a.id || `${a.user_id}:${a.work_date}:${a.start_time}:${a.end_time}:${a.availability_type}`), user_id: str(a.user_id), work_date: date(a.work_date),
    start: minutes(a.start_time), end: minutes(a.end_time), availability_type: str(a.availability_type || 'AVAILABLE').toUpperCase(),
  }));
  const skills = arr(input.employee_skills).map(s => ({ ...s, id: str(s.id || `${s.user_id}:${s.skill_code}`), user_id: str(s.user_id), skill_code: str(s.skill_code), level: Number(s.level ?? 0), status: str(s.status || 'ACTIVE').toUpperCase(), can_mentor: Boolean(s.can_mentor), can_work_alone: Boolean(s.can_work_alone) }));
  const requirements = arr(input.staffing_requirements).map(r => ({
    ...r, id: str(r.id), store_id: str(r.store_id), work_date: date(r.work_date), start: minutes(r.start_time), end: minutes(r.end_time),
    skill_code: r.skill_code == null || r.skill_code === '' ? null : str(r.skill_code), min_skill_level: Number(r.min_skill_level ?? 0),
    minimum_headcount: Number(r.minimum_headcount ?? 0), target_headcount: Number(r.target_headcount ?? 0), maximum_headcount: Number(r.maximum_headcount ?? 0),
  })).sort((a, b) => intervalKey(a).localeCompare(intervalKey(b)));
  const official = arr(input.work_schedules).map(s => ({ ...s, user_id: str(s.user_id), store_id: str(s.store_id), work_date: date(s.work_date), start: minutes(s.start_time), end: minutes(s.end_time), status: str(s.status || 'APPROVED').toUpperCase() }));

  for (const e of employees) {
    if (e.allowed_store_ids.length) continue;
    e.profile_access_scope = str(e.profile.access_scope).toUpperCase();
  }
  return { weekStart, weekEnd, profiles, stores, employees, availability, skills, requirements, official };
}

function storeAllowed(employee, store) {
  if (!store || str(store.status).toUpperCase() !== 'ACTIVE') return false;
  if (employee.allowed_store_ids.length) return employee.allowed_store_ids.includes(store.id);
  const scope = employee.profile_access_scope || str(employee.profile?.access_scope).toUpperCase();
  if (!scope) return false;
  const tokens = scope.split(/[;,\s]+/).filter(Boolean);
  return tokens.includes('ALL') || tokens.includes(str(store.code).toUpperCase());
}
function skillFor(skills, userId, code) { return skills.find(s => s.user_id === userId && s.skill_code === code && s.status === 'ACTIVE') || null; }
function usableAvailability(ctx, employeeId, req) {
  const rows = ctx.availability.filter(a => a.user_id === employeeId && a.work_date === req.work_date);
  if (rows.some(a => a.availability_type === 'UNAVAILABLE' && overlaps(req.start, req.end, a.start, a.end))) return { ok: false, code: HARD.UNAVAILABLE_OVERLAP, preferred: false };
  const usable = rows.filter(a => ['AVAILABLE', 'PREFERRED'].includes(a.availability_type) && contains(a.start, a.end, req.start, req.end));
  return usable.length ? { ok: true, preferred: usable.some(a => a.availability_type === 'PREFERRED') } : { ok: false, code: HARD.NOT_AVAILABLE, preferred: false };
}
function assignmentHours(assignments, userId, predicate = () => true) { return assignments.filter(a => a.user_id === userId && predicate(a)).reduce((sum, a) => sum + durationHours(a.start, a.end), 0); }
function officialConflict(ctx, userId, req) { return ctx.official.some(s => s.user_id === userId && ['APPROVED', 'PENDING'].includes(s.status) && s.work_date === req.work_date && overlaps(s.start, s.end, req.start, req.end)); }
function currentConflict(assignments, userId, req) { return assignments.some(a => a.user_id === userId && a.work_date === req.work_date && overlaps(a.start, a.end, req.start, req.end)); }
function restOk(assignments, userId, req, minRest) {
  if (!(minRest > 0)) return true;
  const gap = minRest * 60;
  return assignments.filter(a => a.user_id === userId && a.work_date === req.work_date).every(a => !overlaps(a.start, a.end, req.start, req.end) && Math.max(a.start, req.start) - Math.min(a.end, req.end) >= gap);
}
function eligible(ctx, employee, req, assignments) {
  if (str(employee.profile.status).toUpperCase() !== 'ACTIVE') return { ok: false, code: HARD.EMPLOYEE_INACTIVE };
  if (!storeAllowed(employee, ctx.stores.get(req.store_id))) return { ok: false, code: HARD.STORE_NOT_ALLOWED };
  const av = usableAvailability(ctx, employee.user_id, req); if (!av.ok) return av;
  if (officialConflict(ctx, employee.user_id, req) || currentConflict(assignments, employee.user_id, req)) return { ok: false, code: HARD.EMPLOYEE_ASSIGNMENT_OVERLAP };
  const h = durationHours(req.start, req.end);
  if (employee.max_daily_hours > 0 && assignmentHours(assignments, employee.user_id, a => a.work_date === req.work_date) + h > employee.max_daily_hours) return { ok: false, code: HARD.DAILY_HOURS_LIMIT };
  if (employee.max_weekly_hours > 0 && assignmentHours(assignments, employee.user_id, a => inWeek(a.work_date, ctx.weekStart, ctx.weekEnd)) + h > employee.max_weekly_hours) return { ok: false, code: HARD.WEEKLY_HOURS_LIMIT };
  if (!restOk(assignments, employee.user_id, req, employee.min_rest_hours)) return { ok: false, code: HARD.MIN_REST_NOT_MET };
  const skill = req.skill_code ? skillFor(ctx.skills, employee.user_id, req.skill_code) : null;
  if (req.skill_code && (!skill || skill.level < req.min_skill_level)) return { ok: false, code: HARD.SKILL_NOT_QUALIFIED };
  return { ok: true, preferred: av.preferred, preferredStore: employee.preferred_store_id === req.store_id, skill, cost: Number(employee.grade?.hourly_rate ?? 0), hours: h };
}
function candidateVector(check, employee, assignments) {
  return [Number(check.preferredStore), Number(check.preferred), -assignmentHours(assignments, employee.user_id), -Number(employee.grade?.hourly_rate ?? 0), employee.user_id];
}
function compareVector(a, b) { for (let i = 0; i < a.length; i += 1) { if (a[i] === b[i]) continue; if (typeof a[i] === 'string') return a[i].localeCompare(b[i]); return b[i] - a[i]; } return 0; }
function assignmentFrom(req, employee, check) { return { assignment_key: `${intervalKey(req)}|${employee.user_id}`, requirement_id: req.id, user_id: employee.user_id, store_id: req.store_id, work_date: req.work_date, start: req.start, end: req.end, start_time: timeText(req.start), end_time: timeText(req.end), skill_code: req.skill_code, skill_level: check.skill?.level ?? 0, role: 'PRIMARY', score: 0 };
}
function coverage(req, assignments, ctx) {
  const points = new Set([req.start, req.end]);
  assignments.filter(a => a.work_date === req.work_date && a.store_id === req.store_id && overlaps(a.start, a.end, req.start, req.end)).forEach(a => { points.add(Math.max(a.start, req.start)); points.add(Math.min(a.end, req.end)); });
  const p = [...points].sort((a, b) => a - b); const slices = [];
  for (let i = 0; i < p.length - 1; i += 1) {
    const s = p[i], e = p[i + 1]; if (s === e) continue;
    const active = assignments.filter(a => a.work_date === req.work_date && a.store_id === req.store_id && overlaps(a.start, a.end, s, e));
    const count = req.skill_code ? active.filter(a => { const sk = skillFor(ctx.skills, a.user_id, req.skill_code); return sk && sk.level >= req.min_skill_level; }).length : new Set(active.map(a => a.user_id)).size;
    slices.push({ start: s, end: e, count });
  }
  return slices;
}
function coverageState(req, slices) {
  if (!slices.length) return { state: 'UNDER_MINIMUM', under: true, over: false, minMet: false, targetMet: false };
  const under = slices.some(x => x.count < req.minimum_headcount);
  const over = slices.some(x => x.count > req.maximum_headcount);
  const targetMet = !under && slices.every(x => x.count >= req.target_headcount) && !over;
  return { state: over ? 'OVER_MAXIMUM' : under ? 'UNDER_MINIMUM' : targetMet ? 'TARGET_MET' : 'PARTIAL', under, over, minMet: !under, targetMet };
}
function generate(input) {
  const ctx = normalize(input); const assignments = []; const unmet = []; const warnings = [];
  const employeeById = new Map(ctx.employees.map(e => [e.user_id, e]));
  for (const req of ctx.requirements) {
    let needed = req.minimum_headcount;
    let current = coverageState(req, coverage(req, assignments, ctx));
    while (needed > 0) {
      const candidates = ctx.employees.map(e => { const check = eligible(ctx, e, req, assignments); return check.ok ? { employee: e, check, vector: candidateVector(check, e, assignments) } : null; }).filter(Boolean).sort((a, b) => compareVector(a.vector, b.vector));
      if (!candidates.length) break;
      const chosen = candidates[0]; const a = assignmentFrom(req, chosen.employee, chosen.check); assignments.push(a); needed -= 1;
      current = coverageState(req, coverage(req, assignments, ctx));
      if (current.over) { assignments.pop(); break; }
    }
    const finalCoverage = coverageState(req, coverage(req, assignments, ctx));
    if (finalCoverage.under) unmet.push({ requirement_id: req.id, code: HARD.MINIMUM_COVERAGE_SHORTAGE, state: finalCoverage.state });
    if (finalCoverage.over) unmet.push({ requirement_id: req.id, code: HARD.MAXIMUM_COVERAGE_EXCEEDED, state: finalCoverage.state });
    if (!finalCoverage.targetMet) warnings.push({ requirement_id: req.id, code: SOFT.TARGET_NOT_MET, state: finalCoverage.state });
  }
  assignments.sort((a, b) => `${a.work_date}|${a.start_time}|${a.store_id}|${a.requirement_id}|${a.user_id}`.localeCompare(`${b.work_date}|${b.start_time}|${b.store_id}|${b.requirement_id}|${b.user_id}`));
  const totalHours = assignments.reduce((s, a) => s + durationHours(a.start, a.end), 0);
  const estimatedCost = assignments.reduce((s, a) => s + durationHours(a.start, a.end) * Number(employeeById.get(a.user_id)?.grade?.hourly_rate ?? 0), 0);
  return { rule_version: RULE_VERSION, timezone: BUSINESS_TZ, week_start: ctx.weekStart, week_end: ctx.weekEnd, deterministic: true, published: false, assignments, unmet, warnings, total_hours: totalHours, estimated_cost: estimatedCost };
}
function validateDraft(input, draft) {
  const ctx = normalize(input); const assignments = arr(draft?.assignments); const violations = [];
  for (const a of assignments) {
    const e = ctx.employees.find(x => x.user_id === str(a.user_id));
    const req = ctx.requirements.find(r => r.id === str(a.requirement_id));
    if (!e || !req) { violations.push({ code: HARD.EMPLOYEE_INACTIVE, assignment_key: a.assignment_key }); continue; }
    const check = eligible(ctx, e, { ...req, start: minutes(a.start_time ?? timeText(a.start)), end: minutes(a.end_time ?? timeText(a.end)) }, assignments.filter(x => x.assignment_key !== a.assignment_key));
    if (!check.ok) violations.push({ code: check.code, assignment_key: a.assignment_key });
  }
  for (const req of ctx.requirements) {
    const state = coverageState(req, coverage(req, assignments, ctx));
    if (state.under) violations.push({ code: HARD.MINIMUM_COVERAGE_SHORTAGE, requirement_id: req.id });
    if (state.over) violations.push({ code: HARD.MAXIMUM_COVERAGE_EXCEEDED, requirement_id: req.id });
  }
  return { valid: violations.length === 0, rule_version: RULE_VERSION, timezone: BUSINESS_TZ, violations };
}

module.exports = { RULE_VERSION, BUSINESS_TZ, HARD, SOFT, generate, validateDraft, normalize };
