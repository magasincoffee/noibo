/* =========================================================
   MAGASIN — LỊCH NHÂN SỰ V2
   Workforce scheduling foundation for PART_TIME + FULL_TIME.

   PRINCIPLES
   - Employee reports AVAILABILITY, not a fixed shift.
   - OWNER defines STAFFING REQUIREMENTS by time window, store and skill.
   - Skills / training / can-work-alone are explicit constraints.
   - Scheduler produces DRAFT only. Manager reviews and publishes through
     the existing work_schedules flow.
   - Keep current Sheet "Lịch làm việc" as official schedule output.

   New operational sheets are created lazily:
   - Lịch sẵn sàng
   - Nhu cầu nhân sự
   - Năng lực nhân viên
   - Ràng buộc nhân viên
   - Lịch xếp tự động
========================================================= */

const SCHEDULE_V2 = {
  AVAILABILITY: 'Lịch sẵn sàng',
  REQUIREMENTS: 'Nhu cầu nhân sự',
  SKILLS: 'Năng lực nhân viên',
  CONSTRAINTS: 'Ràng buộc nhân viên',
  DRAFTS: 'Lịch xếp tự động'
};

const SCHEDULE_V2_HEADERS = {
  'Lịch sẵn sàng': [
    'ID','Ngày','Giờ bắt đầu','Giờ kết thúc','Cửa hàng','Tên đăng nhập',
    'Trạng thái','Ghi chú','Tạo lúc','Cập nhật lúc'
  ],
  'Nhu cầu nhân sự': [
    'ID','Ngày','Giờ bắt đầu','Giờ kết thúc','Cửa hàng','Năng lực',
    'Cấp tối thiểu','Tối thiểu','Mục tiêu','Tối đa','Trạng thái',
    'Ghi chú','Tạo bởi','Tạo lúc','Cập nhật lúc'
  ],
  'Năng lực nhân viên': [
    'ID','Tên đăng nhập','Năng lực','Cấp độ','Đứng ca độc lập','Có thể hướng dẫn',
    'Xác nhận bởi','Xác nhận lúc','Trạng thái','Ghi chú','Cập nhật lúc'
  ],
  'Ràng buộc nhân viên': [
    'ID','Tên đăng nhập','Loại hợp đồng','Tối đa giờ/ngày','Tối đa giờ/tuần',
    'Giờ nghỉ tối thiểu','Được đứng ca một mình','Cần người hướng dẫn',
    'Cửa hàng ưu tiên','Cửa hàng được phép','Trạng thái','Ghi chú','Cập nhật lúc'
  ],
  'Lịch xếp tự động': [
    'Generation ID','Ngày','Giờ bắt đầu','Giờ kết thúc','Cửa hàng','Tên đăng nhập',
    'Năng lực','Cấp độ','Trạng thái','Điểm','Chi phí dự kiến','Cảnh báo','Ghi chú','Tạo lúc'
  ]
};

function scheduleV2GetSheet_(name) {
  const sheet = getOperationalSheet_(name);
  if (sheet) return sheet;
  return scheduleV2EnsureSheet_(name);
}

function scheduleV2EnsureSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  const headers = SCHEDULE_V2_HEADERS[name] || [];
  if (headers.length && sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function scheduleV2EnsureAllSheets_() {
  Object.keys(SCHEDULE_V2_HEADERS).forEach(function(name) {
    scheduleV2EnsureSheet_(name);
  });
}

function scheduleV2DateKey_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const text = String(value == null ? '' : value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function scheduleV2TimeKey_(value) {
  const text = String(value == null ? '' : value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '';
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || (m !== 0 && m !== 30)) return '';
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function scheduleV2Minutes_(value) {
  const key = scheduleV2TimeKey_(value);
  if (!key) return null;
  const parts = key.split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function scheduleV2WeekStart_(date) {
  const d = new Date(date || new Date());
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function scheduleV2WeekBounds_(baseDate, offsetWeeks) {
  const start = scheduleV2WeekStart_(baseDate || new Date());
  start.setDate(start.getDate() + (Number(offsetWeeks || 0) * 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    start: start,
    end: end,
    startKey: scheduleV2DateKey_(start),
    endKey: scheduleV2DateKey_(end)
  };
}

function scheduleV2IsWithin_(date, startKey, endKey) {
  return date >= startKey && date <= endKey;
}

function scheduleV2ParseScope_(value) {
  return parseScopeList_(String(value || ''));
}

function scheduleV2EmployeeRecord_(username) {
  const sheet = ensureUserHeaders_();
  const rows = sheet.getDataRange().getValues();
  const key = String(username || '').trim().toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1] || '').trim().toLowerCase() !== key) continue;
    return {
      username: String(rows[i][1] || ''),
      fullName: String(rows[i][2] || ''),
      role: normalizeRole_(rows[i][7]),
      status: String(rows[i][8] || '').toUpperCase(),
      accessScope: String(rows[i][15] || '')
    };
  }
  return null;
}

function scheduleV2RequireSelf_(token) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return { ok: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  return { ok: true, user: user };
}

function scheduleV2RequireOwner_(token) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return { ok: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  if (String(user.role || '').toUpperCase() !== 'OWNER') {
    return { ok: false, message: 'Chỉ Chủ hệ thống được cấu hình nhu cầu nhân sự.' };
  }
  return { ok: true, user: user };
}

function scheduleV2RequireManager_(token, store) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return { ok: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  const role = String(user.role || '').toUpperCase();
  if (role !== 'OWNER' && role !== 'STORE_MANAGER') {
    return { ok: false, message: 'Bạn không có quyền quản lý lịch.' };
  }
  if (store && !scopeAllows_(user.accessScope, store) && role !== 'OWNER') {
    return { ok: false, message: 'Bạn không có quyền quản lý cửa hàng này.' };
  }
  return { ok: true, user: user };
}

function scheduleV2FindRow_(sheet, id) {
  const target = String(id || '').trim();
  if (!target) return null;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '') === target) return { rowIndex: i + 1, row: rows[i] };
  }
  return null;
}

/* ===================== EMPLOYEE AVAILABILITY ===================== */

function getMyAvailability(token, filters) {
  const auth = scheduleV2RequireSelf_(token);
  if (!auth.ok) return fail_(auth.message);
  const bounds = scheduleV2WeekBounds_(new Date(), Number(filters && filters.offsetWeeks || 1));
  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.AVAILABILITY);
  const rows = sheet.getDataRange().getValues();
  const username = String(auth.user.username || '').toLowerCase();
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const date = scheduleV2DateKey_(r[1]);
    if (String(r[5] || '').toLowerCase() !== username) continue;
    if (!scheduleV2IsWithin_(date, bounds.startKey, bounds.endKey)) continue;
    if (String(r[6] || 'ACTIVE').toUpperCase() === 'CANCELLED') continue;
    items.push({
      id: String(r[0] || ''), date: date,
      start: scheduleV2TimeKey_(r[2]), end: scheduleV2TimeKey_(r[3]),
      store: String(r[4] || ''), status: String(r[6] || 'ACTIVE').toUpperCase(),
      note: String(r[7] || '')
    });
  }
  items.sort(function(a, b) { return (a.date + a.start).localeCompare(b.date + b.start); });
  return { ok: true, week: bounds, items: items };
}

function saveMyAvailability(token, data) {
  const auth = scheduleV2RequireSelf_(token);
  if (!auth.ok) return fail_(auth.message);
  const date = clean_(data && data.date);
  const start = scheduleV2TimeKey_(data && data.start);
  const end = scheduleV2TimeKey_(data && data.end);
  const store = clean_(data && data.store);
  const note = clean_(data && data.note);
  const bounds = scheduleV2WeekBounds_(new Date(), 1);

  if (!date || !start || !end || !store) return fail_('Vui lòng chọn đầy đủ ngày, thời gian và cửa hàng.');
  if (!scheduleV2IsWithin_(date, bounds.startKey, bounds.endKey)) return fail_('Chỉ được đăng ký khả năng làm cho tuần kế tiếp.');
  if ((scheduleV2Minutes_(end) || 0) <= (scheduleV2Minutes_(start) || 0)) return fail_('Giờ kết thúc phải lớn hơn giờ bắt đầu.');
  if (!scopeAllows_(auth.user.accessScope, store)) return fail_('Bạn không có quyền đăng ký tại cửa hàng này.');

  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.AVAILABILITY);
  const rows = sheet.getDataRange().getValues();
  const username = String(auth.user.username || '');

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[5] || '').toLowerCase() !== username.toLowerCase()) continue;
    if (scheduleV2DateKey_(r[1]) !== date) continue;
    if (scheduleV2TimeKey_(r[2]) !== start || scheduleV2TimeKey_(r[3]) !== end) continue;
    if (String(r[4] || '').toUpperCase() !== store.toUpperCase()) continue;
    if (String(r[6] || '').toUpperCase() !== 'CANCELLED') return fail_('Bạn đã đăng ký khoảng thời gian này.');
  }

  const now = new Date();
  sheet.appendRow([Utilities.getUuid(), date, start, end, store, username, 'ACTIVE', note, now, now]);
  SpreadsheetApp.flush();
  return { ok: true, message: 'Đã lưu thời gian có thể làm.' };
}

function cancelMyAvailability(token, id) {
  const auth = scheduleV2RequireSelf_(token);
  if (!auth.ok) return fail_(auth.message);
  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.AVAILABILITY);
  const found = scheduleV2FindRow_(sheet, id);
  if (!found) return fail_('Không tìm thấy đăng ký thời gian làm.');
  if (String(found.row[5] || '').toLowerCase() !== String(auth.user.username || '').toLowerCase()) return fail_('Bạn không thể hủy đăng ký của người khác.');
  if (String(found.row[6] || '').toUpperCase() === 'CANCELLED') return fail_('Đăng ký đã được hủy.');
  sheet.getRange(found.rowIndex, 7).setValue('CANCELLED');
  sheet.getRange(found.rowIndex, 10).setValue(new Date());
  SpreadsheetApp.flush();
  return { ok: true, message: 'Đã hủy đăng ký.' };
}

/* ===================== SKILLS + CONSTRAINTS ===================== */

function getEmployeeSchedulingProfile(token, username) {
  const permission = scheduleV2RequireManager_(token, '');
  if (!permission.ok) return fail_(permission.message);
  const target = scheduleV2EmployeeRecord_(username);
  if (!target) return fail_('Không tìm thấy nhân viên.');

  const skillsSheet = scheduleV2EnsureSheet_(SCHEDULE_V2.SKILLS);
  const skillRows = skillsSheet.getDataRange().getValues();
  const skills = [];
  for (let i = 1; i < skillRows.length; i++) {
    const r = skillRows[i];
    if (String(r[1] || '').toLowerCase() !== target.username.toLowerCase()) continue;
    if (String(r[8] || 'ACTIVE').toUpperCase() !== 'ACTIVE') continue;
    skills.push({ skill: String(r[2] || ''), level: Number(r[3] || 0), canWorkAlone: String(r[4] || '').toUpperCase() === 'YES', canMentor: String(r[5] || '').toUpperCase() === 'YES' });
  }

  const constraintsSheet = scheduleV2EnsureSheet_(SCHEDULE_V2.CONSTRAINTS);
  const constraintRows = constraintsSheet.getDataRange().getValues();
  let constraints = null;
  for (let i = 1; i < constraintRows.length; i++) {
    const r = constraintRows[i];
    if (String(r[1] || '').toLowerCase() !== target.username.toLowerCase()) continue;
    constraints = {
      employmentType: String(r[2] || 'PART_TIME'),
      maxDailyHours: Number(r[3] || 0), maxWeeklyHours: Number(r[4] || 0), minRestHours: Number(r[5] || 0),
      canWorkAlone: String(r[6] || '').toUpperCase() === 'YES', mentorRequired: String(r[7] || '').toUpperCase() === 'YES',
      preferredStore: String(r[8] || ''), allowedStores: String(r[9] || ''), status: String(r[10] || 'ACTIVE').toUpperCase(), note: String(r[11] || '')
    };
    break;
  }

  return { ok: true, employee: target, skills: skills, constraints: constraints };
}

function saveEmployeeSkill(token, data) {
  const permission = scheduleV2RequireManager_(token, '');
  if (!permission.ok) return fail_(permission.message);
  const username = clean_(data && data.username);
  const skill = clean_(data && data.skill);
  const level = Number(data && data.level);
  if (!username || !skill || !Number.isFinite(level) || level < 0 || level > 4) return fail_('Dữ liệu năng lực không hợp lệ.');
  const employee = scheduleV2EmployeeRecord_(username);
  if (!employee) return fail_('Không tìm thấy nhân viên.');
  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.SKILLS);
  const rows = sheet.getDataRange().getValues();
  const canWorkAlone = level >= 3;
  const canMentor = level >= 4;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1] || '').toLowerCase() !== username.toLowerCase()) continue;
    if (String(rows[i][2] || '').toLowerCase() !== skill.toLowerCase()) continue;
    const rowIndex = i + 1;
    sheet.getRange(rowIndex, 4, 1, 8).setValues([[level, canWorkAlone ? 'YES' : 'NO', canMentor ? 'YES' : 'NO', permission.user.username || '', new Date(), 'ACTIVE', clean_(data && data.note), new Date()]]);
    SpreadsheetApp.flush();
    return { ok: true, message: 'Đã cập nhật năng lực.' };
  }
  sheet.appendRow([Utilities.getUuid(), username, skill, level, canWorkAlone ? 'YES' : 'NO', canMentor ? 'YES' : 'NO', permission.user.username || '', new Date(), 'ACTIVE', clean_(data && data.note), new Date()]);
  SpreadsheetApp.flush();
  return { ok: true, message: 'Đã thêm năng lực.' };
}

function saveEmployeeConstraint(token, data) {
  const permission = scheduleV2RequireManager_(token, '');
  if (!permission.ok) return fail_(permission.message);
  const username = clean_(data && data.username);
  if (!username) return fail_('Thiếu tên đăng nhập nhân viên.');
  const employee = scheduleV2EmployeeRecord_(username);
  if (!employee) return fail_('Không tìm thấy nhân viên.');
  const values = [
    clean_(data && data.employmentType) || 'PART_TIME',
    Number(data && data.maxDailyHours || 0), Number(data && data.maxWeeklyHours || 0), Number(data && data.minRestHours || 0),
    data && data.canWorkAlone ? 'YES' : 'NO', data && data.mentorRequired ? 'YES' : 'NO', clean_(data && data.preferredStore), clean_(data && data.allowedStores),
    'ACTIVE', clean_(data && data.note), new Date()
  ];
  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.CONSTRAINTS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1] || '').toLowerCase() !== username.toLowerCase()) continue;
    sheet.getRange(i + 1, 3, 1, values.length).setValues([values]);
    SpreadsheetApp.flush();
    return { ok: true, message: 'Đã cập nhật ràng buộc nhân viên.' };
  }
  sheet.appendRow([Utilities.getUuid(), username].concat(values));
  SpreadsheetApp.flush();
  return { ok: true, message: 'Đã lưu ràng buộc nhân viên.' };
}

/* ===================== STAFFING REQUIREMENTS ===================== */

function getStaffingRequirements(token, filters) {
  const permission = scheduleV2RequireManager_(token, filters && filters.store || '');
  if (!permission.ok) return fail_(permission.message);
  const startDate = clean_(filters && filters.startDate);
  const endDate = clean_(filters && filters.endDate);
  const storeFilter = clean_(filters && filters.store);
  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.REQUIREMENTS);
  const rows = sheet.getDataRange().getValues();
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const date = scheduleV2DateKey_(r[1]);
    const store = String(r[4] || '');
    if (!date) continue;
    if (startDate && date < startDate) continue;
    if (endDate && date > endDate) continue;
    if (storeFilter && store.toUpperCase() !== storeFilter.toUpperCase()) continue;
    if (!scopeAllows_(permission.user.accessScope, store) && String(permission.user.role).toUpperCase() !== 'OWNER') continue;
    items.push({
      id: String(r[0] || ''), date: date, start: scheduleV2TimeKey_(r[2]), end: scheduleV2TimeKey_(r[3]), store: store,
      skill: String(r[5] || ''), minSkill: Number(r[6] || 0), minimum: Number(r[7] || 0), target: Number(r[8] || 0), maximum: Number(r[9] || 0),
      status: String(r[10] || 'ACTIVE').toUpperCase(), note: String(r[11] || '')
    });
  }
  items.sort(function(a,b){return (a.date+a.start+a.store).localeCompare(b.date+b.start+b.store);});
  return { ok: true, items: items };
}

function saveStaffingRequirement(token, data) {
  const permission = scheduleV2RequireOwner_(token);
  if (!permission.ok) return fail_(permission.message);
  const date = clean_(data && data.date), start = scheduleV2TimeKey_(data && data.start), end = scheduleV2TimeKey_(data && data.end), store = clean_(data && data.store);
  const skill = clean_(data && data.skill);
  const minSkill = Number(data && data.minSkill || 0), minimum = Number(data && data.minimum || 0), target = Number(data && data.target || minimum), maximum = Number(data && data.maximum || target);
  if (!date || !start || !end || !store) return fail_('Thiếu ngày, giờ hoặc cửa hàng.');
  if ((scheduleV2Minutes_(end) || 0) <= (scheduleV2Minutes_(start) || 0)) return fail_('Giờ kết thúc phải lớn hơn giờ bắt đầu.');
  if (minimum < 0 || target < minimum || maximum < target) return fail_('Minimum / Target / Maximum không hợp lệ.');
  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.REQUIREMENTS);
  const id = clean_(data && data.id);
  const rowValues = [date, start, end, store, skill, minSkill, minimum, target, maximum, 'ACTIVE', clean_(data && data.note), permission.user.username || '', new Date(), new Date()];
  if (id) {
    const found = scheduleV2FindRow_(sheet, id);
    if (found) {
      sheet.getRange(found.rowIndex, 2, 1, rowValues.length).setValues([rowValues]);
      SpreadsheetApp.flush();
      return { ok: true, message: 'Đã cập nhật nhu cầu nhân sự.' };
    }
  }
  sheet.appendRow([Utilities.getUuid()].concat(rowValues));
  SpreadsheetApp.flush();
  return { ok: true, message: 'Đã lưu nhu cầu nhân sự.' };
}

function copyStaffingRequirements(token, data) {
  const permission = scheduleV2RequireOwner_(token);
  if (!permission.ok) return fail_(permission.message);
  const fromStart = clean_(data && data.fromStart), toStart = clean_(data && data.toStart), store = clean_(data && data.store);
  if (!fromStart || !toStart || !store) return fail_('Thiếu tuần nguồn, tuần đích hoặc cửa hàng.');
  const sourceEnd = scheduleV2DateKey_(new Date(new Date(fromStart + 'T12:00:00').getTime() + 6 * 86400000));
  const targetDates = [];
  for (let i = 0; i < 7; i++) targetDates.push(scheduleV2DateKey_(new Date(new Date(toStart + 'T12:00:00').getTime() + i * 86400000)));
  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.REQUIREMENTS);
  const rows = sheet.getDataRange().getValues();
  const clones = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i], date = scheduleV2DateKey_(r[1]), rowStore = String(r[4] || '');
    if (rowStore.toUpperCase() !== store.toUpperCase() || !scheduleV2IsWithin_(date, fromStart, sourceEnd)) continue;
    const dayOffset = Math.round((new Date(date + 'T12:00:00') - new Date(fromStart + 'T12:00:00')) / 86400000);
    const newDate = targetDates[dayOffset];
    if (!newDate) continue;
    clones.push([Utilities.getUuid(), newDate, scheduleV2TimeKey_(r[2]), scheduleV2TimeKey_(r[3]), rowStore, String(r[5] || ''), Number(r[6] || 0), Number(r[7] || 0), Number(r[8] || 0), Number(r[9] || 0), 'ACTIVE', String(r[11] || ''), permission.user.username || '', new Date(), new Date()]);
  }
  if (clones.length) sheet.getRange(sheet.getLastRow() + 1, 1, clones.length, clones[0].length).setValues(clones);
  SpreadsheetApp.flush();
  return { ok: true, copied: clones.length, message: 'Đã sao chép ' + clones.length + ' yêu cầu nhân sự.' };
}

/* ===================== SCHEDULER V1 — DRAFT ONLY ===================== */

function generateScheduleDraft(token, filters) {
  const permission = scheduleV2RequireManager_(token, filters && filters.store || '');
  if (!permission.ok) return fail_(permission.message);
  const store = clean_(filters && filters.store);
  const startDate = clean_(filters && filters.startDate);
  const endDate = clean_(filters && filters.endDate);
  if (!store || !startDate || !endDate) return fail_('Cần cửa hàng, ngày bắt đầu và ngày kết thúc.');

  const requirementsResult = getStaffingRequirements(token, {startDate:startDate, endDate:endDate, store:store});
  if (!requirementsResult.ok) return requirementsResult;
  const requirements = requirementsResult.items.filter(function(x){return x.status === 'ACTIVE';});
  if (!requirements.length) return fail_('Chưa có nhu cầu nhân sự cho khoảng thời gian này.');

  const availabilitySheet = scheduleV2EnsureSheet_(SCHEDULE_V2.AVAILABILITY);
  const availabilityRows = availabilitySheet.getDataRange().getValues();
  const availability = [];
  for (let i = 1; i < availabilityRows.length; i++) {
    const r = availabilityRows[i];
    const date = scheduleV2DateKey_(r[1]);
    if (date < startDate || date > endDate) continue;
    if (String(r[6] || 'ACTIVE').toUpperCase() !== 'ACTIVE') continue;
    if (String(r[4] || '').toUpperCase() !== store.toUpperCase()) continue;
    availability.push({date:date,start:scheduleV2TimeKey_(r[2]),end:scheduleV2TimeKey_(r[3]),username:String(r[5] || '')});
  }

  const candidateNames = {};
  availability.forEach(function(a){candidateNames[a.username.toLowerCase()] = a.username;});
  const candidates = [];
  Object.keys(candidateNames).forEach(function(key){
    const profile = scheduleV2EmployeeRecord_(candidateNames[key]);
    if (!profile || profile.status !== 'ACTIVE' || profile.role === 'OWNER') return;
    if (!scopeAllows_(profile.accessScope, store)) return;
    const profileData = getEmployeeSchedulingProfile(token, profile.username);
    if (!profileData.ok) return;
    const levelMap = {};
    (profileData.skills || []).forEach(function(s){levelMap[String(s.skill).toLowerCase()] = s;});
    const c = profileData.constraints || {};
    candidates.push({profile:profile, skills:levelMap, constraints:c});
  });

  if (!candidates.length) return fail_('Chưa có nhân viên phù hợp trong các đăng ký thời gian có thể làm.');

  const assignments = [];
  const hoursByUser = {};
  const warnings = [];
  const generationId = Utilities.getUuid();

  requirements.forEach(function(req){
    const reqStart = scheduleV2Minutes_(req.start), reqEnd = scheduleV2Minutes_(req.end);
    let need = Math.max(req.target || req.minimum || 0, req.minimum || 0);
    const chosen = [];

    candidates.forEach(function(c){
      const username = c.profile.username;
      const skillData = req.skill ? c.skills[String(req.skill).toLowerCase()] : null;
      if (req.skill && (!skillData || Number(skillData.level) < Number(req.minSkill || 0))) return;
      const dailyKey = req.date + '|' + username.toLowerCase();
      const currentHours = Number(hoursByUser[dailyKey] || 0);
      const weeklyKey = startDate + '|' + endDate + '|' + username.toLowerCase();
      const weekHours = Number(hoursByUser[weeklyKey] || 0);
      const allowed = c.constraints && c.constraints.allowedStores ? c.constraints.allowedStores : '';
      if (allowed && !scopeAllows_(allowed, store)) return;
      const avail = availability.filter(function(a){
        return a.username.toLowerCase() === username.toLowerCase() && a.date === req.date && (scheduleV2Minutes_(a.start) || 0) <= reqStart && (scheduleV2Minutes_(a.end) || 0) >= reqEnd;
      });
      if (!avail.length) return;
      const maxDaily = Number(c.constraints && c.constraints.maxDailyHours || 0);
      const maxWeekly = Number(c.constraints && c.constraints.maxWeeklyHours || 0);
      const reqHours = (reqEnd - reqStart) / 60;
      if (maxDaily && currentHours + reqHours > maxDaily) return;
      if (maxWeekly && weekHours + reqHours > maxWeekly) return;
      const overlap = assignments.some(function(a){
        return a.username.toLowerCase() === username.toLowerCase() && a.date === req.date && reqStart < a.endMinutes && reqEnd > a.startMinutes;
      });
      if (overlap) return;
      const aloneRequired = !!(c.constraints && c.constraints.mentorRequired);
      const score = (skillData ? Number(skillData.level) * 20 : 0) + (c.constraints && c.constraints.preferredStore && c.constraints.preferredStore.toUpperCase() === store.toUpperCase() ? 10 : 0) - currentHours;
      chosen.push({candidate:c, score:score, aloneRequired:aloneRequired});
    });

    chosen.sort(function(a,b){return b.score-a.score;});
    const selected = chosen.slice(0, need);
    if (selected.length < (req.minimum || 0)) {
      warnings.push(req.date + ' ' + req.start + '-' + req.end + ': thiếu ' + ((req.minimum || 0) - selected.length) + ' người.');
    }

    selected.forEach(function(item){
      const username = item.candidate.profile.username;
      const reqHours = (reqEnd - reqStart) / 60;
      assignments.push({generationId:generationId,date:req.date,start:req.start,end:req.end,store:req.store,username:username,skill:req.skill,level:req.skill && item.candidate.skills[req.skill.toLowerCase()] ? Number(item.candidate.skills[req.skill.toLowerCase()].level) : 0,status:'DRAFT',score:Number(item.score.toFixed(2)),hours:reqHours,warning:item.aloneRequired?'Cần mentor / kiểm tra trước khi publish':''});
      const dailyKey = req.date + '|' + username.toLowerCase();
      const weeklyKey = startDate + '|' + endDate + '|' + username.toLowerCase();
      hoursByUser[dailyKey] = Number(hoursByUser[dailyKey] || 0) + reqHours;
      hoursByUser[weeklyKey] = Number(hoursByUser[weeklyKey] || 0) + reqHours;
    });
  });

  const draftSheet = scheduleV2EnsureSheet_(SCHEDULE_V2.DRAFTS);
  if (assignments.length) {
    const rows = assignments.map(function(a){
      const note = a.warning || '';
      return [a.generationId,a.date,a.start,a.end,a.store,a.username,a.skill,a.level,a.status,a.score,'',note,'AUTO_V1',new Date()];
    });
    draftSheet.getRange(draftSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  SpreadsheetApp.flush();

  return {ok:true,generationId:generationId,assignments:assignments,warnings:warnings,summary:{assignments:assignments.length,warnings:warnings.length}};
}

function getScheduleDraft(token, generationId) {
  const permission = scheduleV2RequireManager_(token, '');
  if (!permission.ok) return fail_(permission.message);
  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.DRAFTS);
  const rows = sheet.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0] || '') !== String(generationId || '')) continue;
    if (!scopeAllows_(permission.user.accessScope, String(r[4] || '')) && String(permission.user.role).toUpperCase() !== 'OWNER') continue;
    items.push({generationId:String(r[0]||''),date:scheduleV2DateKey_(r[1]),start:scheduleV2TimeKey_(r[2]),end:scheduleV2TimeKey_(r[3]),store:String(r[4]||''),username:String(r[5]||''),skill:String(r[6]||''),level:Number(r[7]||0),status:String(r[8]||''),score:Number(r[9]||0),warning:String(r[11]||''),note:String(r[12]||'')});
  }
  return {ok:true,items:items};
}

function cancelScheduleDraft(token, generationId) {
  const permission = scheduleV2RequireManager_(token, '');
  if (!permission.ok) return fail_(permission.message);
  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.DRAFTS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '') !== String(generationId || '')) continue;
    if (!scopeAllows_(permission.user.accessScope, String(rows[i][4] || '')) && String(permission.user.role).toUpperCase() !== 'OWNER') return fail_('Bạn không có quyền hủy draft này.');
    sheet.getRange(i + 1, 9).setValue('CANCELLED');
  }
  SpreadsheetApp.flush();
  return {ok:true,message:'Đã hủy draft xếp lịch.'};
}

/* ===================== SETUP / DIAGNOSTIC ===================== */

function setupScheduleV2() {
  scheduleV2EnsureAllSheets_();
  return {ok:true,message:'Đã tạo/kiểm tra các sheet Lịch nhân sự V2.'};
}
