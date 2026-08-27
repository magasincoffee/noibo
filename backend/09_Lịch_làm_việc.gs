/* =========================================================
   MAGASIN — LỊCH LÀM VIỆC V3.3
   Cập nhật theo yêu cầu Lịch làm việc nhân viên + Quản lý xếp lịch.

   MỤC TIÊU:
   - Nhân viên đăng ký bằng: Ngày / Giờ bắt đầu / Giờ kết thúc / Cửa hàng.
   - Giờ mới chỉ nhận mốc 00:00 -> 23:30, bước 30 phút.
   - Cột C "Ca" vẫn được giữ để tương thích dữ liệu cũ, nhưng được
     suy ra tự động từ giờ bắt đầu.
   - Giữ nguyên Sheet "Lịch làm việc", không tạo Sheet mới.
   - Hỗ trợ nhiều ca trong một ngày.
   - Quản lý có thể xem, duyệt yêu cầu và xếp lịch trực tiếp.
   - Trạng thái vẫn dùng PENDING / APPROVED / CANCELLED.
   - Lịch quản lý xếp trực tiếp được đánh dấu bằng [MANAGER_ASSIGNED]
     trong cột Ghi chú để không phải đổi cấu trúc Sheet.
========================================================= */

function scheduleDateKey_(value) {
  return toVietnamDateKey_(value);
}

/* ---------- Chuẩn hóa thời gian ---------- */

function scheduleTimeToMinutes_(value) {
  const text = clean_(value);
  const match = text.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23) return null;
  if (minute !== 0 && minute !== 30) return null;

  return hour * 60 + minute;
}

function scheduleIsValidDate_(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(clean_(value));
}

function scheduleShiftLabel_(start) {
  const minutes = scheduleTimeToMinutes_(start);
  if (minutes == null) return '';

  const hour = Math.floor(minutes / 60);

  if (hour >= 5 && hour < 12) return 'Sáng';
  if (hour >= 12 && hour < 17) return 'Chiều';
  if (hour >= 17 || hour < 5) return 'Tối';

  return 'Khác';
}

function scheduleDisplayTime_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'H:mm');
  }

  const text = String(value == null ? '' : value).trim();
  const match = text.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return text;

  return String(Number(match[1])) + ':' + match[2];
}

function scheduleTimeKey_(value) {
  const display = scheduleDisplayTime_(value);
  const match = display.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  return String(Number(match[1])).padStart(2,'0') + ':' + match[2];
}

function scheduleWeekStartDate_(baseDate) {
  const d = new Date(baseDate);
  d.setHours(12,0,0,0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function scheduleDateKeyFromDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function scheduleNextWeekBounds_() {
  const start = scheduleWeekStartDate_(new Date());
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    startKey: scheduleDateKeyFromDate_(start),
    endKey: scheduleDateKeyFromDate_(end)
  };
}

function scheduleIsNextWeekDate_(dateKey) {
  const bounds = scheduleNextWeekBounds_();
  return String(dateKey || '') >= bounds.startKey &&
         String(dateKey || '') <= bounds.endKey;
}

function scheduleOrigin_(note) {
  const text = String(note || '');
  if (text.indexOf('[MANAGER_ASSIGNED]') !== -1) return 'MANAGER_ASSIGNED';
  return 'USER_REQUEST';
}

function scheduleOriginLabel_(origin) {
  return origin === 'MANAGER_ASSIGNED'
    ? 'Quản lý xếp lịch'
    : 'Nhân viên đăng ký';
}

function scheduleStatusLabel_(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'APPROVED') return 'Đã duyệt';
  if (value === 'CANCELLED') return 'Đã hủy';
  if (value === 'PENDING') return 'Chờ duyệt';
  return value || 'Không xác định';
}

/* ---------- Đọc lịch cá nhân ---------- */

function getMySchedule(token) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const sheet = getOperationalSheet_('Lịch làm việc');
  const rows = getOperationalRows_(sheet);
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];

    if (
      String(r[6] || '').toLowerCase() !==
      user.username.toLowerCase()
    ) {
      continue;
    }

    const dateKey = scheduleDateKey_(r[1]);
    const dateObject = /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
      ? new Date(dateKey + 'T00:00:00')
      : null;

    const note = String(r[10] || '');
    const origin = scheduleOrigin_(note);
    const status = String(r[7] || '').toUpperCase();

    items.push({
      id: String(r[0] || ''),
      date: dateKey,
      weekday: dateObject
        ? [
            'Chủ Nhật',
            'Thứ Hai',
            'Thứ Ba',
            'Thứ Tư',
            'Thứ Năm',
            'Thứ Sáu',
            'Thứ Bảy'
          ][dateObject.getDay()]
        : '',
      shift: String(r[2] || ''),
      start: scheduleDisplayTime_(r[3]),
      end: scheduleDisplayTime_(r[4]),
      store: String(r[5] || ''),
      status: status,
      statusLabel: scheduleStatusLabel_(status),
      origin: origin,
      originLabel: scheduleOriginLabel_(origin),
      approver: String(r[8] || ''),
      approvedAt: r[9] || '',
      note: note
    });
  }

  items.sort(function(a, b) {
    const byDate = String(a.date).localeCompare(String(b.date));
    if (byDate !== 0) return byDate;
    return String(a.start).localeCompare(String(b.start));
  });

  return { ok: true, items: items };
}

/* ---------- Đăng ký ca nhân viên ---------- */

function registerShift(token, data) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const date = clean_(data && data.date);
  const start = clean_(data && data.start);
  const end = clean_(data && data.end);
  const store = clean_(data && data.store);

  if (!date || !start || !end || !store) {
    return fail_('Vui lòng chọn đầy đủ ngày, giờ bắt đầu, giờ kết thúc và cửa hàng.');
  }

  if (!scheduleIsValidDate_(date)) {
    return fail_('Ngày làm việc không hợp lệ.');
  }

  if (!scheduleIsNextWeekDate_(date)) {
    return fail_('Nhân viên chỉ được đăng ký ca cho 7 ngày của tuần kế tiếp.');
  }

  const startMinutes = scheduleTimeToMinutes_(start);
  const endMinutes = scheduleTimeToMinutes_(end);

  if (startMinutes == null || endMinutes == null) {
    return fail_('Giờ phải theo mốc 00 hoặc 30 phút, định dạng HH:mm.');
  }

  if (endMinutes <= startMinutes) {
    return fail_('Giờ kết thúc phải lớn hơn giờ bắt đầu.');
  }

  if (!scopeAllows_(user.accessScope, store)) {
    return fail_('Bạn không có quyền đăng ký ca tại cửa hàng này.');
  }

  const sheet = getOperationalSheet_('Lịch làm việc');
  const rows = getOperationalRows_(sheet);
  const normalizedUsername = user.username.toLowerCase();
  const normalizedStore = String(store).trim().toUpperCase();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (
      String(r[6] || '').toLowerCase() !== normalizedUsername ||
      scheduleDateKey_(r[1]) !== date ||
      String(r[5] || '').trim().toUpperCase() !== normalizedStore ||
      scheduleTimeKey_(r[3]) !== scheduleTimeKey_(start) ||
      scheduleTimeKey_(r[4]) !== scheduleTimeKey_(end)
    ) {
      continue;
    }

    const existingStatus = String(r[7] || '').toUpperCase();
    if (existingStatus !== 'CANCELLED') {
      return fail_('Bạn đã có một đăng ký trùng ngày, giờ và cửa hàng.');
    }
  }

  const shift = scheduleShiftLabel_(start);

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    sheet.appendRow([
      Utilities.getUuid(),
      date,
      shift,
      start,
      end,
      store,
      user.username,
      'PENDING',
      '',
      '',
      ''
    ]);

    SpreadsheetApp.flush();
  } catch (err) {
    return fail_(
      'Không thể ghi đăng ký ca: ' +
      String(err && err.message || err)
    );
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }

  return {
    ok: true,
    message: 'Đã gửi đăng ký ca. Vui lòng chờ quản lý duyệt.'
  };
}

/* ---------- Hủy đăng ký của nhân viên ---------- */

function cancelShift(token, id) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const targetId = clean_(id);
  const sheet = getOperationalSheet_('Lịch làm việc');
  const rows = getOperationalRows_(sheet);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== targetId) continue;

    if (
      String(rows[i][6]).toLowerCase() !==
      user.username.toLowerCase()
    ) {
      return fail_('Bạn không thể hủy ca của người khác.');
    }

    const currentStatus = String(rows[i][7] || '').toUpperCase();

    if (currentStatus === 'APPROVED') {
      return fail_('Ca đã được duyệt. Hãy sử dụng chức năng Đổi ca.');
    }

    if (currentStatus === 'CANCELLED') {
      return fail_('Đăng ký ca này đã được hủy.');
    }

    sheet.getRange(i + 1, 8).setValue('CANCELLED');
    SpreadsheetApp.flush();

    return { ok: true, message: 'Đã hủy đăng ký ca.' };
  }

  return fail_('Không tìm thấy đăng ký ca.');
}

/* =========================================================
   QUẢN LÝ LỊCH LÀM VIỆC
   - OWNER / STORE_MANAGER.
   - Tôn trọng Phạm vi truy cập.
========================================================= */

function getScheduleStoreOptions_(user) {
  const scope = parseScopeList_(user.accessScope);
  let stores = scope.filter(function(x) {
    return x !== 'ALL';
  });

  if (scope.indexOf('ALL') !== -1) {
    try {
      const storeSheet = ensureStoreMasterData_();
      const rows = getOperationalRows_(storeSheet);

      stores = rows.slice(1)
        .filter(function(r) {
          return String(r[3] || 'ACTIVE').toUpperCase() !== 'INACTIVE';
        })
        .map(function(r) {
          return clean_(r[1] || r[2]);
        })
        .filter(Boolean);
    } catch (err) {
      stores = [];
    }
  }

  const unique = {};
  stores.forEach(function(store) {
    const value = clean_(store);
    const key = value.toUpperCase();
    if (key && !unique[key]) unique[key] = value;
  });

  return Object.keys(unique)
    .map(function(key) { return unique[key]; })
    .sort();
}

function getScheduleEmployeeOptions(token, store) {
  const permission = requireManagerRole_(token, store);
  if (!permission.ok) return fail_(permission.message);

  const manager = permission.user;
  const targetStore = clean_(store);

  if (!targetStore) {
    return fail_('Vui lòng chọn cửa hàng trước khi chọn nhân viên.');
  }

  const sheet = ensureUserHeaders_();
  const rows = sheet.getDataRange().getValues();
  const employees = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;

    const status = String(row[8] || '').toUpperCase();
    if (status !== 'ACTIVE') continue;

    const role = normalizeRole_(row[7]);
    if (role === 'OWNER') continue;

    const accessScope = String(row[15] || '');
    if (!scopeAllows_(accessScope, targetStore)) continue;

    employees.push({
      username: String(row[1] || ''),
      fullName: String(row[2] || ''),
      role: role,
      roleLabel: roleLabel_(role),
      accessScope: accessScope
    });
  }

  employees.sort(function(a, b) {
    return String(a.fullName || a.username).localeCompare(
      String(b.fullName || b.username),
      'vi'
    );
  });

  return {
    ok: true,
    store: targetStore,
    manager: manager.username,
    employees: employees
  };
}

function getScheduleManagement(token, filters) {
  const startDate = clean_(filters && filters.startDate);
  const endDate = clean_(filters && filters.endDate);
  const requestedStore = clean_(filters && filters.store);

  const permission = requireManagerRole_(token, requestedStore);
  if (!permission.ok) return fail_(permission.message);

  const manager = permission.user;

  if (startDate && !scheduleIsValidDate_(startDate)) {
    return fail_('Ngày bắt đầu không hợp lệ.');
  }

  if (endDate && !scheduleIsValidDate_(endDate)) {
    return fail_('Ngày kết thúc không hợp lệ.');
  }

  if (startDate && endDate && startDate > endDate) {
    return fail_('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
  }

  const stores = getScheduleStoreOptions_(manager);
  const storeFilterKey = requestedStore.toUpperCase();

  const sheet = getOperationalSheet_('Lịch làm việc');
  const rows = getOperationalRows_(sheet);
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const dateKey = scheduleDateKey_(r[1]);
    const store = String(r[5] || '').trim();
    const status = String(r[7] || '').toUpperCase();

    if (!dateKey) continue;
    if (startDate && dateKey < startDate) continue;
    if (endDate && dateKey > endDate) continue;
    if (storeFilterKey && store.toUpperCase() !== storeFilterKey) continue;

    if (!scopeAllows_(manager.accessScope, store)) continue;

    if (status === 'CANCELLED') {
      /* Vẫn trả về để quản lý thấy lịch sử/hủy. */
    }

    const note = String(r[10] || '');
    const origin = scheduleOrigin_(note);

    items.push({
      id: String(r[0] || ''),
      date: dateKey,
      shift: String(r[2] || ''),
      start: scheduleDisplayTime_(r[3]),
      end: scheduleDisplayTime_(r[4]),
      store: store,
      username: String(r[6] || ''),
      status: status,
      statusLabel: scheduleStatusLabel_(status),
      origin: origin,
      originLabel: scheduleOriginLabel_(origin),
      approver: String(r[8] || ''),
      approvedAt: r[9] || '',
      note: note
    });
  }

  items.sort(function(a, b) {
    const dateCompare = String(a.date).localeCompare(String(b.date));
    if (dateCompare !== 0) return dateCompare;

    const storeCompare = String(a.store).localeCompare(String(b.store));
    if (storeCompare !== 0) return storeCompare;

    return String(a.start).localeCompare(String(b.start));
  });

  return {
    ok: true,
    items: items,
    stores: stores
  };
}

function scheduleFindRowById_(id) {
  const targetId = clean_(id);
  if (!targetId) return null;

  const sheet = getOperationalSheet_('Lịch làm việc');
  const rows = getOperationalRows_(sheet);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '') === targetId) {
      return {
        sheet: sheet,
        rowIndex: i + 1,
        row: rows[i]
      };
    }
  }

  return null;
}

function approveSchedule(token, id, note) {
  const found = scheduleFindRowById_(id);
  if (!found) return fail_('Không tìm thấy đăng ký lịch làm việc.');

  const row = found.row;
  const store = String(row[5] || '');
  const currentStatus = String(row[7] || '').toUpperCase();

  const permission = requireManagerRole_(token, store);
  if (!permission.ok) return fail_(permission.message);

  if (currentStatus !== 'PENDING') {
    return fail_(
      'Chỉ đăng ký đang ở trạng thái Chờ duyệt mới có thể duyệt.'
    );
  }

  const manager = permission.user;
  const noteText = clean_(note);
  const oldNote = String(row[10] || '').trim();
  const audit = 'Quản lý ' +
    String(manager.name || manager.username || '') +
    ' duyệt lịch ' +
    (typeof formatVietnamDateTime_ === 'function'
      ? formatVietnamDateTime_(new Date())
      : new Date());

  const finalNote = [
    oldNote,
    noteText ? ('Ghi chú: ' + noteText) : '',
    audit
  ].filter(Boolean).join(' || ');

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    found.sheet.getRange(found.rowIndex, 8).setValue('APPROVED');
    found.sheet.getRange(found.rowIndex, 9).setValue(
      manager.username || manager.name || ''
    );
    found.sheet.getRange(found.rowIndex, 10).setValue(new Date());
    found.sheet.getRange(found.rowIndex, 11).setValue(finalNote);

    SpreadsheetApp.flush();
  } catch (err) {
    return fail_(
      'Không thể duyệt lịch: ' +
      String(err && err.message || err)
    );
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }

  return {
    ok: true,
    message: 'Đã duyệt lịch làm việc.'
  };
}

function assignSchedule(token, data) {
  const date = clean_(data && data.date);
  const start = clean_(data && data.start);
  const end = clean_(data && data.end);
  const store = clean_(data && data.store);
  const username = clean_(data && data.username);
  const noteText = clean_(data && data.note);

  if (!date || !start || !end || !store || !username) {
    return fail_(
      'Vui lòng chọn đủ ngày, giờ bắt đầu, giờ kết thúc, cửa hàng và nhân viên.'
    );
  }

  if (!scheduleIsValidDate_(date)) {
    return fail_('Ngày làm việc không hợp lệ.');
  }

  const startMinutes = scheduleTimeToMinutes_(start);
  const endMinutes = scheduleTimeToMinutes_(end);

  if (startMinutes == null || endMinutes == null) {
    return fail_('Giờ phải theo mốc 00 hoặc 30 phút.');
  }

  if (endMinutes <= startMinutes) {
    return fail_('Giờ kết thúc phải lớn hơn giờ bắt đầu.');
  }

  const permission = requireManagerRole_(token, store);
  if (!permission.ok) return fail_(permission.message);

  const userSheet = ensureUserHeaders_();
  const userRows = userSheet.getDataRange().getValues();
  let targetUser = null;

  for (let i = 1; i < userRows.length; i++) {
    const row = userRows[i];
    if (String(row[1] || '').toLowerCase() !== username.toLowerCase()) continue;

    targetUser = {
      username: String(row[1] || ''),
      fullName: String(row[2] || ''),
      role: normalizeRole_(row[7]),
      status: String(row[8] || ''),
      accessScope: String(row[15] || '')
    };
    break;
  }

  if (!targetUser) {
    return fail_('Không tìm thấy nhân viên cần xếp lịch.');
  }

  if (targetUser.status.toUpperCase() !== 'ACTIVE') {
    return fail_('Tài khoản nhân viên đang không hoạt động.');
  }

  if (targetUser.role === 'OWNER') {
    return fail_('Không xếp lịch trực tiếp cho tài khoản Chủ cửa hàng.');
  }

  if (!scopeAllows_(targetUser.accessScope, store)) {
    return fail_(
      'Nhân viên không có Phạm vi truy cập phù hợp với cửa hàng ' +
      store + '.'
    );
  }

  const sheet = getOperationalSheet_('Lịch làm việc');
  const rows = getOperationalRows_(sheet);
  const normalizedStore = store.toUpperCase();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];

    if (
      String(r[6] || '').toLowerCase() !== username.toLowerCase() ||
      scheduleDateKey_(r[1]) !== date ||
      String(r[5] || '').trim().toUpperCase() !== normalizedStore ||
      scheduleTimeKey_(r[3]) !== scheduleTimeKey_(start) ||
      scheduleTimeKey_(r[4]) !== scheduleTimeKey_(end)
    ) {
      continue;
    }

    const status = String(r[7] || '').toUpperCase();

    if (status !== 'CANCELLED') {
      return fail_('Lịch trùng đã tồn tại cho nhân viên này.');
    }
  }

  const shift = scheduleShiftLabel_(start);

  const baseNote = '[MANAGER_ASSIGNED]';
  const auditNote = 'Quản lý ' +
    String(
      permission.user.name ||
      permission.user.username ||
      ''
    ) +
    ' xếp lịch ' +
    (typeof formatVietnamDateTime_ === 'function'
      ? formatVietnamDateTime_(new Date())
      : new Date());

  const finalNote = [
    baseNote,
    noteText ? ('Ghi chú: ' + noteText) : '',
    auditNote
  ].filter(Boolean).join(' || ');

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    sheet.appendRow([
      Utilities.getUuid(),
      date,
      shift,
      start,
      end,
      store,
      targetUser.username,
      'APPROVED',
      permission.user.username || permission.user.name || '',
      new Date(),
      finalNote
    ]);

    SpreadsheetApp.flush();
  } catch (err) {
    return fail_(
      'Không thể xếp lịch: ' +
      String(err && err.message || err)
    );
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }

  return {
    ok: true,
    message:
      'Đã xếp lịch cho ' +
      String(targetUser.fullName || targetUser.username) +
      ' (' + start + ' – ' + end + ').'
  };
}
