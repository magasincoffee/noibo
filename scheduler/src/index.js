const RULE_VERSION = 'RULE_V1';
const BUSINESS_TZ = 'Asia/Ho_Chi_Minh';

const HARD = Object.freeze({
  EMPLOYEE_INACTIVE: 'EMPLOYEE_INACTIVE', STORE_NOT_ALLOWED: 'STORE_NOT_ALLOWED', NOT_AVAILABLE: 'NOT_AVAILABLE',
  UNAVAILABLE_OVERLAP: 'UNAVAILABLE_OVERLAP', EMPLOYEE_ASSIGNMENT_OVERLAP: 'EMPLOYEE_ASSIGNMENT_OVERLAP',
  DAILY_HOURS_LIMIT: 'DAILY_HOURS_LIMIT', WEEKLY_HOURS_LIMIT: 'WEEKLY_HOURS_LIMIT', MIN_REST_NOT_MET: 'MIN_REST_NOT_MET',
  SKILL_NOT_QUALIFIED: 'SKILL_NOT_QUALIFIED', MINIMUM_COVERAGE_SHORTAGE: 'MINIMUM_COVERAGE_SHORTAGE',
  MAXIMUM_COVERAGE_EXCEEDED: 'MAXIMUM_COVERAGE_EXCEEDED',
});
const SOFT = Object.freeze({ TARGET_NOT_MET: 'TARGET_NOT_MET', PREFERRED_STORE_NOT_USED: 'PREFERRED_STORE_NOT_USED', PREFERRED_WINDOW_NOT_USED: 'PREFERRED_WINDOW_NOT_USED' });

const arr = v => Array.isArray(v) ? v : [];
const str = v => String(v ?? '').trim();
function date(v) { const s = str(v).slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`INVALID_DATE:${v}`); return s; }
function minutes(v) { if (typeof v === 'number') return v; const m = /^(\d{1,2}):(\d{2})$/.exec(str(v)); if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error(`INVALID_TIME:${v}`); return Number(m[1]) * 60 + Number(m[2]); }
const time = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const overlap = (a, b, c, d) => a < d && c < b;
const contain = (a, b, c, d) => a <= c && d <= b;
const hours = (a, b) => (b - a) / 60;
function dayKey(v) { const [y, m, d] = date(v).split('-').map(Number); return Date.UTC(y, m - 1, d) / 60000; }
function absoluteMinutes(workDate, timeMinutes) { return dayKey(workDate) + timeMinutes; }
function plusDays(v, n) { const d = new Date(`${v}T12:00:00+07:00`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function monday(v) { const d = new Date(`${v}T12:00:00+07:00`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }

function normalize(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const weekStart = date(input.week_start); if (monday(weekStart) !== weekStart) throw new Error('INVALID_WEEK_START_MUST_BE_MONDAY');
  const weekEnd = plusDays(weekStart, 6); if (input.week_end && date(input.week_end) !== weekEnd) throw new Error('INVALID_WEEK_RANGE');
  const profiles = new Map(arr(input.profiles).map(p => [str(p.id), p]));
  const stores = new Map(arr(input.stores).map(s => [str(s.id), s]));
  const grades = new Map(arr(input.employee_grades).map(g => [str(g.user_id), g]));
  const employees = arr(input.employee_constraints).map(c => ({ ...c, user_id: str(c.user_id), profile: profiles.get(str(c.user_id)), grade: grades.get(str(c.user_id)), allowed_store_ids: arr(c.allowed_store_ids).map(str), max_daily_hours: Number(c.max_daily_hours ?? 0), max_weekly_hours: Number(c.max_weekly_hours ?? 0), min_rest_hours: Number(c.min_rest_hours ?? 0), preferred_store_id: c.preferred_store_id == null ? null : str(c.preferred_store_id) })).filter(e => e.profile);
  const availability = arr(input.employee_availability).map(a => ({ ...a, id: str(a.id || `${a.user_id}:${a.work_date}:${a.start_time}:${a.end_time}`), user_id: str(a.user_id), work_date: date(a.work_date), start: minutes(a.start_time), end: minutes(a.end_time), availability_type: str(a.availability_type || 'AVAILABLE').toUpperCase() }));
  const skills = arr(input.employee_skills).map(s => ({ ...s, user_id: str(s.user_id), skill_code: str(s.skill_code), level: Number(s.level ?? 0), status: str(s.status || 'ACTIVE').toUpperCase(), can_mentor: Boolean(s.can_mentor) }));
  const requirements = arr(input.staffing_requirements).map(r => ({ ...r, id: str(r.id), store_id: str(r.store_id), work_date: date(r.work_date), start: minutes(r.start_time), end: minutes(r.end_time), skill_code: r.skill_code == null || r.skill_code === '' ? null : str(r.skill_code), min_skill_level: Number(r.min_skill_level ?? 0), minimum_headcount: Number(r.minimum_headcount ?? 0), target_headcount: Number(r.target_headcount ?? 0), maximum_headcount: Number(r.maximum_headcount ?? 0) })).sort((a, b) => `${a.work_date}|${a.start}|${a.store_id}|${a.id}`.localeCompare(`${b.work_date}|${b.start}|${b.store_id}|${b.id}`));
  const official = arr(input.work_schedules).map(s => ({ ...s, user_id: str(s.user_id), work_date: date(s.work_date), start: minutes(s.start_time), end: minutes(s.end_time), status: str(s.status || 'APPROVED').toUpperCase() }));
  return { weekStart, weekEnd, profiles, stores, grades, employees, availability, skills, requirements, official };
}
function storeAllowed(e, store) { if (!store || str(store.status).toUpperCase() !== 'ACTIVE') return false; if (e.allowed_store_ids.length) return e.allowed_store_ids.includes(str(store.id)); const scope = str(e.profile.access_scope).toUpperCase(); if (!scope) return false; const t = scope.split(/[;,\s]+/).filter(Boolean); return t.includes('ALL') || t.includes(str(store.code).toUpperCase()); }
function skill(ctx, id, code) { return ctx.skills.find(s => s.user_id === id && s.skill_code === code && s.status === 'ACTIVE') || null; }
function available(ctx, e, r) { const rows = ctx.availability.filter(a => a.user_id === e.user_id && a.work_date === r.work_date); if (rows.some(a => a.availability_type === 'UNAVAILABLE' && overlap(r.start, r.end, a.start, a.end))) return { ok: false, code: HARD.UNAVAILABLE_OVERLAP }; const ok = rows.some(a => ['AVAILABLE', 'PREFERRED'].includes(a.availability_type) && contain(a.start, a.end, r.start, r.end)); return ok ? { ok: true, preferred: rows.some(a => a.availability_type === 'PREFERRED' && contain(a.start, a.end, r.start, r.end)) } : { ok: false, code: HARD.NOT_AVAILABLE }; }
function assignedHours(as, id, pred = () => true) { return as.filter(a => a.user_id === id && pred(a)).reduce((s, a) => s + hours(a.start, a.end), 0); }
function restOk(as, id, r, minRest) {
  if (!(minRest > 0)) return true;
  const rStart = absoluteMinutes(r.work_date, r.start);
  const rEnd = absoluteMinutes(r.work_date, r.end);
  return as.filter(a => a.user_id === id).every(a => {
    const aStart = absoluteMinutes(a.work_date, a.start);
    const aEnd = absoluteMinutes(a.work_date, a.end);
    if (overlap(aStart, aEnd, rStart, rEnd)) return false;
    const gap = aEnd <= rStart ? rStart - aEnd : aStart - rEnd;
    return gap >= minRest * 60;
  });
}
function eligible(ctx, e, r, as) {
  if (str(e.profile.status).toUpperCase() !== 'ACTIVE') return { ok: false, code: HARD.EMPLOYEE_INACTIVE };
  if (!storeAllowed(e, ctx.stores.get(r.store_id))) return { ok: false, code: HARD.STORE_NOT_ALLOWED };
  const av = available(ctx, e, r); if (!av.ok) return av;
  if (ctx.official.some(s => s.user_id === e.user_id && ['APPROVED', 'PENDING'].includes(s.status) && s.work_date === r.work_date && overlap(s.start, s.end, r.start, r.end))) return { ok: false, code: HARD.EMPLOYEE_ASSIGNMENT_OVERLAP };
  if (as.some(a => a.user_id === e.user_id && a.work_date === r.work_date && overlap(a.start, a.end, r.start, r.end))) return { ok: false, code: HARD.EMPLOYEE_ASSIGNMENT_OVERLAP };
  const h = hours(r.start, r.end); if (e.max_daily_hours > 0 && assignedHours(as, e.user_id, a => a.work_date === r.work_date) + h > e.max_daily_hours + 1e-9) return { ok: false, code: HARD.DAILY_HOURS_LIMIT };
  if (e.max_weekly_hours > 0 && assignedHours(as, e.user_id) + h > e.max_weekly_hours + 1e-9) return { ok: false, code: HARD.WEEKLY_HOURS_LIMIT };
  if (!restOk(as, e.user_id, r, e.min_rest_hours)) return { ok: false, code: HARD.MIN_REST_NOT_MET };
  const sk = r.skill_code ? skill(ctx, e.user_id, r.skill_code) : null; if (r.skill_code && (!sk || sk.level < r.min_skill_level)) return { ok: false, code: HARD.SKILL_NOT_QUALIFIED };
  return { ok: true, preferred: av.preferred, preferredStore: e.preferred_store_id === r.store_id, skill: sk, cost: Number(e.grade?.hourly_rate ?? 0), hours: h };
}
function coverage(ctx, r, as) { const pts = new Set([r.start, r.end]); as.filter(a => a.work_date === r.work_date && a.store_id === r.store_id && overlap(a.start, a.end, r.start, r.end)).forEach(a => { pts.add(Math.max(a.start, r.start)); pts.add(Math.min(a.end, r.end)); }); const p = [...pts].sort((a, b) => a - b); const out = []; for (let i = 0; i < p.length - 1; i++) { const s = p[i], e = p[i + 1]; const active = as.filter(a => a.work_date === r.work_date && a.store_id === r.store_id && overlap(a.start, a.end, s, e)); const ids = [...new Set(active.map(a => a.user_id))]; const count = r.skill_code ? ids.filter(id => { const sk = skill(ctx, id, r.skill_code); return sk && sk.level >= r.min_skill_level; }).length : ids.length; out.push({ start: s, end: e, count }); } return out; }
function state(r, slices) { if (!slices.length) return 'UNDER_MINIMUM'; if (slices.some(x => x.count > r.maximum_headcount)) return 'OVER_MAXIMUM'; if (slices.some(x => x.count < r.minimum_headcount)) return 'UNDER_MINIMUM'; return slices.every(x => x.count >= r.target_headcount) ? 'TARGET_MET' : 'PARTIAL'; }
function generate(input) {
  const ctx = normalize(input); const assignments = []; const unmet = []; const warnings = [];
  for (const r of ctx.requirements) {
    let need = r.minimum_headcount;
    while (need > 0) {
      const candidates = ctx.employees.map(e => { const c = eligible(ctx, e, r, assignments); return c.ok ? { e, c } : null; }).filter(Boolean).sort((a, b) => Number(b.c.preferredStore) - Number(a.c.preferredStore) || Number(b.c.preferred) - Number(a.c.preferred) || assignedHours(assignments, a.e.user_id) - assignedHours(assignments, b.e.user_id) || a.e.user_id.localeCompare(b.e.user_id));
      if (!candidates.length) break;
      const pick = candidates[0];
      assignments.push({ assignment_key: `${r.work_date}|${time(r.start)}|${r.store_id}|${r.id}|${pick.e.user_id}`, requirement_id: r.id, user_id: pick.e.user_id, store_id: r.store_id, work_date: r.work_date, start: r.start, end: r.end, start_time: time(r.start), end_time: time(r.end), skill_code: r.skill_code, skill_level: pick.c.skill?.level ?? 0, role: 'PRIMARY' });
      need--;
    }
    const st = state(r, coverage(ctx, r, assignments));
    if (st === 'UNDER_MINIMUM') unmet.push({ requirement_id: r.id, code: HARD.MINIMUM_COVERAGE_SHORTAGE, state: st });
    if (st === 'OVER_MAXIMUM') unmet.push({ requirement_id: r.id, code: HARD.MAXIMUM_COVERAGE_EXCEEDED, state: st });
    if (st !== 'TARGET_MET') warnings.push({ requirement_id: r.id, code: SOFT.TARGET_NOT_MET, state: st });
  }
  assignments.sort((a, b) => `${a.work_date}|${a.start_time}|${a.store_id}|${a.requirement_id}|${a.user_id}`.localeCompare(`${b.work_date}|${b.start_time}|${b.store_id}|${b.requirement_id}|${b.user_id}`));
  return { rule_version: RULE_VERSION, timezone: BUSINESS_TZ, week_start: ctx.weekStart, week_end: ctx.weekEnd, deterministic: true, published: false, assignments, unmet, warnings, total_hours: assignments.reduce((s, a) => s + hours(a.start, a.end), 0), estimated_cost: assignments.reduce((s, a) => s + hours(a.start, a.end) * Number(ctx.grades.get(a.user_id)?.hourly_rate ?? 0), 0) };
}
module.exports = { RULE_VERSION, BUSINESS_TZ, HARD, SOFT, normalize, generate };
