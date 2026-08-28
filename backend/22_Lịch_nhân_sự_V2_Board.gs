/* MAGASIN — LỊCH NHÂN SỰ V2 BOARD API */

function getScheduleV2StoreOptions(token) {
  const auth = scheduleV2RequireManager_(token, '');
  if (!auth.ok) return fail_(auth.message);
  return { ok: true, stores: getScheduleStoreOptions_(auth.user) };
}

function getScheduleV2Board(token, filters) {
  const store = clean_(filters && filters.store);
  const startDate = clean_(filters && filters.startDate);
  const endDate = clean_(filters && filters.endDate);
  const permission = scheduleV2RequireManager_(token, store);
  if (!permission.ok) return fail_(permission.message);
  if (!store || !startDate || !endDate) return fail_('Cần cửa hàng, ngày bắt đầu và ngày kết thúc.');
  if (!scheduleIsValidDate_(startDate) || !scheduleIsValidDate_(endDate) || startDate > endDate) return fail_('Khoảng ngày không hợp lệ.');

  const scheduleSheet = getOperationalSheet_('Lịch làm việc');
  const scheduleRows = getOperationalRows_(scheduleSheet);
  const schedules = [];
  for (let i = 1; i < scheduleRows.length; i++) {
    const r = scheduleRows[i];
    const date = scheduleDateKey_(r[1]);
    const rowStore = String(r[5] || '');
    if (rowStore.toUpperCase() !== store.toUpperCase()) continue;
    if (date < startDate || date > endDate) continue;
    const status = String(r[7] || '').toUpperCase();
    if (status === 'CANCELLED') continue;
    schedules.push({
      id: String(r[0] || ''), date: date, start: scheduleDisplayTime_(r[3]), end: scheduleDisplayTime_(r[4]),
      store: rowStore, username: String(r[6] || ''), status: status, origin: scheduleOrigin_(r[10]), note: String(r[10] || '')
    });
  }

  const availabilityResult = getStaffingAvailabilityForBoard_(store, startDate, endDate);
  const requirementsResult = getStaffingRequirements(token, {startDate:startDate,endDate:endDate,store:store});
  return {
    ok: true,
    store: store,
    schedules: schedules,
    availability: availabilityResult,
    requirements: requirementsResult.ok ? requirementsResult.items : []
  };
}

function getStaffingAvailabilityForBoard_(store, startDate, endDate) {
  const sheet = scheduleV2EnsureSheet_(SCHEDULE_V2.AVAILABILITY);
  const rows = sheet.getDataRange().getValues();
  const employees = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const date = scheduleV2DateKey_(r[1]);
    const rowStore = String(r[4] || '');
    if (rowStore.toUpperCase() !== store.toUpperCase()) continue;
    if (date < startDate || date > endDate) continue;
    if (String(r[6] || 'ACTIVE').toUpperCase() !== 'ACTIVE') continue;
    const username = String(r[5] || '');
    if (!employees[username]) {
      const profile = scheduleV2EmployeeRecord_(username);
      employees[username] = {username: username, fullName: profile ? profile.fullName : username, windows: [], skills: [], constraints: null};
    }
    employees[username].windows.push({date:date,start:scheduleV2TimeKey_(r[2]),end:scheduleV2TimeKey_(r[3]),store:rowStore});
  }

  Object.keys(employees).forEach(function(username) {
    const profile = getEmployeeSchedulingProfileForBoard_(username);
    employees[username].skills = profile.skills;
    employees[username].constraints = profile.constraints;
  });
  return Object.keys(employees).map(function(k){return employees[k];});
}

function getEmployeeSchedulingProfileForBoard_(username) {
  const target = scheduleV2EmployeeRecord_(username);
  if (!target) return {skills:[],constraints:null};
  const skillsSheet = scheduleV2EnsureSheet_(SCHEDULE_V2.SKILLS);
  const skillRows = skillsSheet.getDataRange().getValues();
  const skills = [];
  for (let i = 1; i < skillRows.length; i++) {
    const r = skillRows[i];
    if (String(r[1] || '').toLowerCase() !== target.username.toLowerCase()) continue;
    if (String(r[8] || 'ACTIVE').toUpperCase() !== 'ACTIVE') continue;
    skills.push({skill:String(r[2] || ''), level:Number(r[3] || 0), canWorkAlone:String(r[4] || '').toUpperCase()==='YES', canMentor:String(r[5] || '').toUpperCase()==='YES'});
  }
  const cSheet = scheduleV2EnsureSheet_(SCHEDULE_V2.CONSTRAINTS);
  const cRows = cSheet.getDataRange().getValues();
  let constraints = null;
  for (let i = 1; i < cRows.length; i++) {
    const r=cRows[i];
    if(String(r[1]||'').toLowerCase() !== target.username.toLowerCase()) continue;
    constraints={employmentType:String(r[2]||'PART_TIME'),maxDailyHours:Number(r[3]||0),maxWeeklyHours:Number(r[4]||0),minRestHours:Number(r[5]||0),canWorkAlone:String(r[6]||'').toUpperCase()==='YES',mentorRequired:String(r[7]||'').toUpperCase()==='YES',preferredStore:String(r[8]||''),allowedStores:String(r[9]||'')};
    break;
  }
  return {skills:skills,constraints:constraints};
}
