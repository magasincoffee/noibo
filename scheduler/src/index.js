const RULE_VERSION = 'RULE_V1';
const TZ = 'Asia/Ho_Chi_Minh';

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

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
}

function asArray(value) { return Array.isArray(value) ? value : []; }

function normalizeTime(value) {
  const raw = String(value ?? '').trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) throw new Error(`INVALID_TIME:${raw}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error(`INVALID_TIME:${raw}`);
  return hour * 60 + minute;
}

function minutesBetween(start, end) {
  return end - start;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function contains(aStart, aEnd, bStart, bEnd) {
  return aStart <= bStart && bEnd <= aEnd;
}

function durationHours(start, end) {
  return minutesBetween(start, end) / 60;
}

function normalizeDate(value) {
  const raw = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error(`INVALID_DATE:${raw}`);
  return raw;
}

function dayOfWeek(date) {
  return (new Date(`${date}T12:00:00+07:00`).getUTCDay() + 6) % 7;
}

function weekEnd(weekStart) {
  const d = new Date(`${weekStart}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

function inWeek(date, start, end) { return date >= start && date <= end; }

function stableStoreAllowed(employee, store, profile) {
  const allowed = asArray(employee.allowed_store_ids).map(String);
  if (allowed.length > 0) return allowed.includes(String(store.id));
  const scope = String(profile?.access_scope ?? '').trim().toUpperCase();
  if (!scope) return false;
  if (scope.split(/[;,\s]+/).includes('ALL')) return true;
  return scope.split(/[;,\s]+/).includes(String(store.code ?? '').trim().toUpperCase());
}

function normalizeInput(input) {
  assertObject(input, 'input');
  const weekStart = normalizeDate(input.week_start);
  if (dayOfWeek(weekStart) !== 0) throw new Error('INVALID_WEEK_START_MUST_BE_MONDAY');
  const weekEndValue = input.week_end ? normalizeDate(input.week_end) : weekEnd(weekStart);
  if (weekEndValue !== weekEnd(weekStart)) throw new Error('INVALID_WEEK_RANGE');

  const profiles = new Map(asArray(input.profiles).map(p => [String(p.id), { ...p, id: String(p.id) }]));
  const stores = new Map(asArray(input.stores).map(s => [String(s.id), { ...s, id: String(s.id) }]));
  const grades = new Map(asArray(input.employee_grades).map(g => [String(g.user_id), { ...g, user_id: String(g.user_id) }]));

  const employees = asArray(input.employee_constraints).map(c => {
    const userId = String(c.user_id);
    const profile = profiles.get(userId);
    return {
      ...c,
      user_id: userId,
      max_daily_hours: Number(c.max_daily_hours ?? 0),
      max_weekly_hours: Number(c.max_weekly_hours ?? 0),
      min_rest_hours: Number(c.min_rest_hours ?? 0),
      allowed_store_ids: asArray(c.allowed_store_ids).map(String),
      profile,
      grade: grades.get(userId),
    };
  }).filter(e => e.profile);

  const availability = asArray(input.employee_availability).map(a => ({
    ...a,
    id: String(a.id ?? `${a.user_id}:${a.work_date}:${a.start_time}:${a.end_time}:${a.availability_type}`),
    user_id: String(a.user_id),
    work_date: normalizeDate(a.work_date),
    start: normalizeTime(a.start_time),
    end: normalizeTime(a.end_time),
    availability_type: String(a.availability_type ?? 'AVAILABLE').toUpperCase(),
    preferred_store_id: a.preferred_store_id == null ? null : String(a.preferred_store_id),
  }));

  const skills = asArray(input.employee_skills).map(s => ({
    ...s,
    id: String(s.id ?? `${s.user_id}:${s.skill_code}`),
    user_id: String(s.user_id),
    skill_code: s.skill_code == null ? null : String(s.skill_code),
    level: Number(s.level ?? 0),
    status: String(s.status ?? 'ACTIVE').toUpperCase(),
    can_mentor: Boolean(s.can_mentor),
    can_work_alone: Boolean(s.can_work_alone),
  }));

  const requirements = asArray(input.staffing_requirements).map(r => ({
    ...r,
    id: String(r.id),
    store_id: String(r.store_id),
    work_date: normalizeDate(r.work_date),
    start: normalizeTime(r.start_time),
    end: normalizeTime(r.end_time),
    skill_code: r.skill_code == null || r.skill_code === '' ? null : String(r.skill_code),
    min_skill_level: Number(r.min_skill_level ?? 0),
    minimum_headcount: Number(r.minimum_headcount ?? 0),
    target_headcount: Number(r.target_headcount ?? 0),
    maximum_headcount: Number(r.maximum_headcount ?? 0),
  })).sort((a, b) => String(a.work_date).localeCompare(b.work_date)
    || a.start - b.start
    || a.end - b.end
    || a.store_id.localeCompare(b.store_id)
    || a.id.localeCompare(b.id));

  const officialSchedules = asArray(input.work_schedules).map(s => ({
    ...s,
    user_id: String(s.user_id),
    store_id: String(s.store_id),
    work_date: normalizeDate(s.work_date),
    start: normalizeTime(s.start_time),
    end: normalizeTime(s.end_time),
  }));

  return { weekStart, weekEnd: weekEndValue, profiles, stores, employees, availability, skills, requirements, officialSchedules };
}

function findSkill(skills, userId, code) {
  return skills.find(s => s.user_id === userId && s.skill_code === code && s.status === 'ACTIVE');
}

function workableWindow(employeeId, date, start, end, availability) {
  const rows = availability.filter(a => a.user_id === employeeId && a.work_date === date);
  const blocked = rows.some(a => a.availability_type === 'UNAVAILABLE' && overlaps(start, end, a.start, a.end));
  if (blocked) return { ok: false, code: HARD.UNAVAILABLE_OVERLAP };
  const workable = rows.some(a => (a.availability_type === 'AVAILABLE' || a.availability_type === 'PREFERRED') && contains(a.start, a.end, start, end));
  if (!workable) return { ok: false, code: HARD.NOT_AVAILABLE };
  const preferred = rows.some(a => a.availability_type === 'PREFERRED' && contains(a.start, a.end, start, end));
  return { ok: true, preferred };
}

function employeeAssignments(assignments, userId) { return assignments.filter(a => a.user_id === userId); }

function employeeHours(assignments, userId, predicate = () => true) {
  return assignments.filter(a => a.user_id === userId && predicate(a)).reduce((sum, a) => sum + durationHours(a.start, a.end), 0);
}

function conflictsWithOfficial(officialSchedules, userId, date, start, end) {
  return officialSchedules.some(s => s.user_id === userId && s.work_date === date && overlaps(start, end, s.start, s.end));
}

function restOk(assignments, userId, date, start, end, minRestHours) {
  if (!(minRestHours > 0)) return true;
  const restMinutes = minRestHours * 60;
  return employeeAssignments(assignments, userId).filter(a => a.work_date === date).every(a => {
    if (overlaps(start, end, a.start, a.end)) return false;
    const gap = a.end <= start ? start - a.end : end <= a.start ? a.start - end : -1;
    return gap >= restMinutes;
  });
}

function eligibleCandidate(ctx, employee, req, assignments, options = {}) {
  if (String(employee.profile.status).toUpperCase() !== 'ACTIVE') return { ok: false, code: HARD.EMPLOYEE_INACTIVE };
  const store = ctx.stores.get(req.store_id);
  if (!store || !stableStoreAllowed(employee, store, employee.profile)) return { ok: false, code: HARD.STORE_NOT_ALLOWED };

  const availability = workableWindow(employee.user_id, req.work_date, req.start, req.end, ctx.availability);
  if (!availability.ok) return availability;

  if (conflictsWithOfficial(ctx.officialSchedules, employee.user_id, req.work_date, req.start, req.end)) {
    return { ok: false, code: HARD.EMPLOYEE_ASSIGNMENT_OVERLAP };
  }
  if (employeeAssignments(assignments, employee.user_id).some(a => a.work_date === req.work_date && overlaps(req.start, req.end, a.start, a.end))) {
    return { ok: false, code: HARD.EMPLOYEE_ASSIGNMENT_OVERLAP };
  }

  const hours = durationHours(req.start, req.end);
  if (employee.max_daily_hours > 0 && employeeHours(assignments, employee.user_id, a => a.work_date === req.work_date) + hours > employee.max_daily_hours + 1e-9) {
    return { ok: false, code: HARD.DAILY_HOURS_LIMIT };
  }
  if (employee.max_weekly_hours > 0 && employeeHours(assignments, employee.user_id) + hours > employee.max_weekly_hours + 1e-9) {
    return { ok: false, code: HARD.WEEKLY_HOURS_LIMIT };
  }
  if (!restOk(assignments, employee.user_id, req.work_date, req.start, req.end, employee.min_rest_hours)) {
    return { ok: false, code: HARD.MIN_REST_NOT_MET };
  }

  if (req.skill_code) {
    const skill = findSkill(ctx.skills, employee.user_id, req.skill_code);
    if (!skill || skill.level < req.min_skill_level) return { ok: false, code: HARD.SKILL_NOT_QUALIFIED };
  }

  const preferredStore = employee.preferred_store_id != null && String(employee.preferred_store_id) === req.store_id;
  const gradeCost = Number(employee.grade?.hourly_rate ?? 0);
  return { ok: true, preferred: availability.preferred, preferredStore, cost: gradeCost, hours };
}

function mentorFor(ctx, trainee, req, assignments) {
  if (!trainee.mentor_required) return null;
  if (!req.skill_code) return null;
  const current = assignments.find(a => a.work_date === req.work_date && a.store_id === req.store_id
    && overlaps(req.start, req.end, a.start, a.end)
    && a.user_id !== trainee.user_id
    && a.mentor_for_skill === req.skill_code);
  if (current) return current.user_id;

  const mentors = ctx.employees.filter(e => {
    if (e.user_id === trainee.user_id) return false;
    const skill = findSkill(ctx.skills, e.user_id, req.skill_code);
    return Boolean(skill && skill.level >= req.min_skill_level && skill.can_mentor);
  });
  const ranked = mentors.map(e => {
    const check = eligibleCandidate(ctx, e, req, assignments, { mentor: true });
    return { e, check };
  }).filter(x => x.check.ok)
    .sort((a, b) => Number(b.check.preferredStore) - Number(a.check.preferredStore)
      || Number(b.check.preferred) - Number(a.check.preferred)
      || employeeWeeklyHours(assignments, a.e.user_id) - employeeWeeklyHours(assignments, b.e.user_id)
      || a.e.user_id.localeCompare(b.e.user_id));
  return ranked[0]?.e?.user_id ?? null;
}

function employeeWeeklyHours(assignments, userId) {
  return employeeHours(assignments, userId);
}

function candidateScore(ctx, employee, req, assignments) {
  const check = eligibleCandidate(ctx, employee, req, assignments);
  if (!check.ok) return null;
  const weekly = employeeWeeklyHours(assignments, employee.user_id);
  const dayCount = employeeAssignments(assignments, employee.user_id).filter(a => a.work_date === req.work_date).length;
  return {
    employee,
    check,
    vector: [
      Number(check.preferredStore),
      Number(check.preferred),
      -weekly,
      -dayCount,
      Number(-check.cost),
      employee.user_id,
    ],
  };
}

function compareVector(a, b) {
  for (let i = 0; i < a.length; i += 1) {
    if (typeof a[i] === 'string') return String(a[i]).localeCompare(String(b[i]));
    if (a[i] !== b[i]) return a[i] > b[i] ? -1 : 1;
  }
  return 0;
}

function buildAssignment(employee, req, score, role = 'PRIMARY', mentorForSkill = null) {
  return {
    assignment_key: `${req.work_date}|${String(req.start).padStart(4, '0')}|${req.store_id}|${req.id}|${employee.user_id}|${role}`,
    user_id: employee.user_id,
    store_id: req.store_id,
    work_date: req.work_date,
    start: req.start,
    end: req.end,
    start_time: `${String(Math.floor(req.start / 60)).padStart(2, '0')}:${String(req.start % 60).padStart(2, '0')}`,
    end_time: `${String(Math.floor(req.end / 60)).padStart(2, '0')}:${String(req.end % 60).padStart(2, '0')}`,
    requirement_id: role === 'MENTOR_SUPPORT' ? null : req.id,
    skill_code: req.skill_code,
    skill_level: req.skill_code ? Number(findSkill(employee.__ctx.skills, employee.user_id, req.skill_code)?.level ?? 0) : 0,
    score: score ?? 0,
    role,
    mentor_for_skill: mentorForSkill,
  };
}

function coverageForRequirement(req, assignments, ctx) {
  const boundaries = new Set([req.start, req.end]);
  for (const a of assignments) {
    if (a.work_date !== req.work_date || a.store_id !== req.store_id) continue;
    if (!overlaps(req.start, req.end, a.start, a.end)) continue;
    boundaries.add(Math.max(req.start, a.start));
    boundaries.add(Math.min(req.end, a.end));
  }
  const points = [...boundaries].sort((a, b) => a - b);
  const segments = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    if (start >= end) continue;
    const active = assignments.filter(a => a.work_date === req.work_date && a.store_id === req.store_id && overlaps(start, end, a.start, a.end));
    const generic = new Set(active.map(a => a.user_id));
    let skillCount = 0;
    if (req.skill_code) {
      for (const userId of new Set(active.map(a => a.user_id))) {
        const skill = findSkill(ctx.skills, userId, req.skill_code);
        if (skill && skill.level >= req.min_skill_level) skillCount += 1;
      }
    }
    segments.push({ start, end, genericCount: generic.size, skillCount });
  }

  const counts = segments.map(s => req.skill_code ? s.skillCount : s.genericCount);
  const minCoverage = counts.length ? Math.min(...counts) : 0;
  const maxCoverage = counts.length ? Math.max(...counts) : 0;
  const targetCoverage = counts.length ? Math.min(...counts) >= req.target_headcount : false;
  let status = 'TARGET_MET';
  if (minCoverage < req.minimum_headcount) status = 'UNDER_MINIMUM';
  else if (maxCoverage > req.maximum_headcount) status = 'OVER_MAXIMUM';
  else if (!targetCoverage) status = 'PARTIAL';
  return { status, minCoverage, maxCoverage, segments };
}

function generate(input) {
  const ctx = normalizeInput(input);
  const assignments = [];
  const warnings = [];
  const unmet = [];
  let sequence = 1;

  for (const req of ctx.requirements) {
    if (!inWeek(req.work_date, ctx.weekStart, ctx.weekEnd)) continue;
    if (req.end <= req.start) throw new Error(`INVALID_REQUIREMENT_INTERVAL:${req.id}`);
    if (!(req.minimum_headcount <= req.target_headcount && req.target_headcount <= req.maximum_headcount)) {
      throw new Error(`INVALID_REQUIREMENT_HEADCOUNT_HIERARCHY:${req.id}`);
    }

    let coverage = coverageForRequirement(req, assignments, ctx);
    const target = Math.min(req.target_headcount, req.maximum_headcount);
    while (coverage.minCoverage < target) {
      const candidates = ctx.employees.map(e => {
        e.__ctx = ctx;
        return candidateScore(ctx, e, req, assignments);
      }).filter(Boolean).sort((a, b) => compareVector(a.vector, b.vector));
      if (!candidates.length) break;

      let chosen = null;
      for (const candidate of candidates) {
        const mentorId = mentorFor(ctx, candidate.employee, req, assignments);
        if (candidate.employee.mentor_required && !mentorId) continue;
        chosen = { candidate, mentorId };
        break;
      }
      if (!chosen) break;

      const { candidate, mentorId } = chosen;
      if (mentorId) {
        const mentor = ctx.employees.find(e => e.user_id === mentorId);
        mentor.__ctx = ctx;
        const mentorCheck = eligibleCandidate(ctx, mentor, req, assignments);
        if (!mentorCheck.ok) break;
        assignments.push(buildAssignment(mentor, req, mentorCheck.preferred ? 1 : 0, 'MENTOR_SUPPORT', req.skill_code));
      }
      assignments.push(buildAssignment(candidate.employee, req, 1, 'PRIMARY'));
      sequence += 1;
      coverage = coverageForRequirement(req, assignments, ctx);
      if (sequence > 10000) throw new Error('SCHEDULER_SAFETY_LIMIT');
    }

    coverage = coverageForRequirement(req, assignments, ctx);
    if (coverage.status === 'UNDER_MINIMUM') {
      unmet.push({ requirement_id: req.id, code: HARD.MINIMUM_COVERAGE_SHORTAGE, coverage });
    } else if (coverage.status === 'OVER_MAXIMUM') {
      unmet.push({ requirement_id: req.id, code: HARD.MAXIMUM_COVERAGE_EXCEEDED, coverage });
    } else if (coverage.status === 'PARTIAL') {
      warnings.push({ requirement_id: req.id, code: SOFT.TARGET_NOT_MET, coverage });
    }
  }

  assignments.sort((a, b) => a.work_date.localeCompare(b.work_date)
    || a.start - b.start
    || a.store_id.localeCompare(b.store_id)
    || String(a.requirement_id ?? '').localeCompare(String(b.requirement_id ?? ''))
    || a.user_id.localeCompare(b.user_id)
    || a.role.localeCompare(b.role));

  for (const a of assignments) delete a.__ctx;

  const totalHours = assignments.reduce((sum, a) => sum + durationHours(a.start, a.end), 0);
  const estimatedCost = assignments.reduce((sum, a) => {
    const grade = ctx.grades?.get(a.user_id);
    return sum + durationHours(a.start, a.end) * Number(grade?.hourly_rate ?? 0);
  }, 0);

  return {
    algorithm_version: RULE_VERSION,
    timezone: TZ,
    week_start: ctx.weekStart,
    week_end: ctx.weekEnd,
    assignments,
    warnings,
    unmet,
    total_hours: Number(totalHours.toFixed(2)),
    estimated_cost: Number(estimatedCost.toFixed(2)),
    deterministic: true,
    published: false,
  };
}

function validateDraft(input, draft) {
  assertObject(draft, 'draft');
  const ctx = normalizeInput(input);
  const assignments = asArray(draft.assignments).map(a => ({
    ...a,
    user_id: String(a.user_id),
    store_id: String(a.store_id),
    work_date: normalizeDate(a.work_date),
    start: Number(a.start),
    end: Number(a.end),
  }));
  const violations = [];

  for (const a of assignments) {
    const employee = ctx.employees.find(e => e.user_id === a.user_id);
    const req = ctx.requirements.find(r => r.id === String(a.requirement_id));
    if (!employee) { violations.push({ code: HARD.EMPLOYEE_INACTIVE, assignment_key: a.assignment_key }); continue; }
    if (!req && a.role !== 'MENTOR_SUPPORT') { violations.push({ code: HARD.MINIMUM_COVERAGE_SHORTAGE, assignment_key: a.assignment_key }); continue; }
    const pseudoReq = req ?? { store_id: a.store_id, work_date: a.work_date, start: a.start, end: a.end, skill_code: a.skill_code, min_skill_level: Number(a.skill_level ?? 0), id: 'MENTOR_SUPPORT' };
    const check = eligibleCandidate(ctx, employee, pseudoReq, assignments.filter(x => x.assignment_key !== a.assignment_key));
    if (!check.ok) violations.push({ code: check.code, assignment_key: a.assignment_key });
  }

  for (const req of ctx.requirements) {
    const coverage = coverageForRequirement(req, assignments, ctx);
    if (coverage.status === 'UNDER_MINIMUM') violations.push({ code: HARD.MINIMUM_COVERAGE_SHORTAGE, requirement_id: req.id, coverage });
    if (coverage.status === 'OVER_MAXIMUM') violations.push({ code: HARD.MAXIMUM_COVERAGE_EXCEEDED, requirement_id: req.id, coverage });
  }

  return { valid: violations.length === 0, violations };
}

module.exports = {
  RULE_VERSION,
  TZ,
  HARD,
  SOFT,
  generate,
  validateDraft,
};
