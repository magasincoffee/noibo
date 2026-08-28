/* MAGASIN — LỊCH NHÂN SỰ V2 HARD-RULE VALIDATION
 * Safety layer around Scheduler V1. The scheduler may propose a draft, but
 * this validator prevents an unsafe draft from being treated as publishable.
 */

function validateScheduleDraftHardRules(token, generationId) {
  const permission = scheduleV2RequireManager_(token, '');
  if (!permission.ok) return fail_(permission.message);
  const draft = getScheduleDraft(token, generationId);
  if (!draft.ok) return draft;

  const items = draft.items || [];
  const errors = [];
  const bySlot = {};
  const hoursByDayUser = {};
  const hoursByWeekUser = {};

  items.forEach(function(item) {
    const employee = scheduleV2EmployeeRecord_(item.username);
    if (!employee) {
      errors.push(item.username + ': không tìm thấy hồ sơ nhân viên.');
      return;
    }
    if (!scopeAllows_(employee.accessScope, item.store) && String(permission.user.role).toUpperCase() !== 'OWNER') {
      errors.push(item.username + ': không có phạm vi cửa hàng ' + item.store + '.');
    }
    const profile = getEmployeeSchedulingProfileForBoard_(employee.username);
    const c = profile.constraints || {};
    const duration = (scheduleV2Minutes_(item.end) - scheduleV2Minutes_(item.start)) / 60;
    const dayKey = item.date + '|' + employee.username.toLowerCase();
    const weekKey = employee.username.toLowerCase();
    hoursByDayUser[dayKey] = Number(hoursByDayUser[dayKey] || 0) + duration;
    hoursByWeekUser[weekKey] = Number(hoursByWeekUser[weekKey] || 0) + duration;

    if (Number(c.maxDailyHours || 0) && hoursByDayUser[dayKey] > Number(c.maxDailyHours)) {
      errors.push(employee.username + ' vượt tối đa giờ/ngày.');
    }
    if (Number(c.maxWeeklyHours || 0) && hoursByWeekUser[weekKey] > Number(c.maxWeeklyHours)) {
      errors.push(employee.username + ' vượt tối đa giờ/tuần.');
    }

    const slotKey = [item.date, item.store, item.start, item.end].join('|');
    (bySlot[slotKey] || (bySlot[slotKey] = [])).push({item:item, employee:employee, profile:profile});
  });

  Object.keys(bySlot).forEach(function(slotKey) {
    const group = bySlot[slotKey];
    group.forEach(function(entry) {
      const c = entry.profile.constraints || {};
      if (!c.mentorRequired && c.canWorkAlone) return;
      const hasMentor = group.some(function(other) {
        if (other.employee.username.toLowerCase() === entry.employee.username.toLowerCase()) return false;
        const oc = other.profile.constraints || {};
        if (oc.canWorkAlone) return true;
        return (other.profile.skills || []).some(function(s){return Number(s.level || 0) >= 4 && s.canMentor;});
      });
      if (!hasMentor) {
        errors.push(entry.employee.username + ': nhân viên training/không đứng ca một mình tại ' + entry.item.date + ' ' + entry.item.start + '–' + entry.item.end + '.');
      }
    });
  });

  if (errors.length) {
    cancelScheduleDraft(token, generationId);
    return {
      ok: false,
      safe: false,
      generationId: generationId,
      message: 'Draft bị chặn vì vi phạm quy tắc an toàn nhân sự.',
      errors: errors
    };
  }

  return {ok:true,safe:true,generationId:generationId,errors:[],message:'Draft vượt qua kiểm tra quy tắc cứng.'};
}
