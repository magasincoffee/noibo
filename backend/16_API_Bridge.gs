/* =========================================================
   MAGASIN — API BRIDGE
   ARCH-02 / GitHub Frontend → Apps Script Backend

   Mục tiêu:
   - Giữ nguyên các module nghiệp vụ 01 → 15.
   - Thêm HTTP POST endpoint cho frontend chạy ngoài HTML Service.
   - Chỉ expose action nằm trong allowlist.
   - Login / đăng ký / xác thực là public action.
   - Các action nghiệp vụ phải có sessionToken.

   Request body:
   {
     "action": "login",
     "sessionToken": "...",
     "payload": { ... }
   }

   Client nên gửi POST text/plain với body JSON.stringify(...)
   để tránh CORS preflight OPTIONS.
========================================================= */

const MAGASIN_API_PUBLIC_ACTIONS_ = [
  'health',
  'login',
  'registerUser',
  'verifyEmail',
  'requestPasswordReset',
  'resetPassword'
];

const MAGASIN_API_SESSION_ACTIONS_ = [
  'getSession',
  'logout',
  'getMyAccess',
  'getCurrentEmployeeProfile',
  'updateCurrentEmployeeProfile',
  'changeCurrentEmployeePassword',
  'getMySchedule',
  'registerShift',
  'cancelShift',
  'getAttendanceOptions',
  'createAttendanceRecord',
  'updateAttendanceRecord',
  'getAttendanceHistory',
  'submitShiftSwap',
  'getMyShiftSwapRequests',
  'getMyKpi',
  'getScheduleManagement',
  'getScheduleEmployeeOptions',
  'approveSchedule',
  'assignSchedule',
  'getAttendanceManagementV33',
  'managerUpdateAttendanceRecord',
  'managerDeleteAttendanceRecord'
];

function doPost(e) {
  try {
    const request = magasinApiParseRequest_(e);
    const action = request.action;

    if (!action) {
      return magasinApiJson_(false, 'Thiếu action.');
    }

    if (action === 'health') {
      return magasinApiJson_(true, 'MAGASIN API đang hoạt động.', {
        service: 'magasin-noibo-api',
        version: '1.0.1',
        time: new Date().toISOString()
      });
    }

    if (MAGASIN_API_PUBLIC_ACTIONS_.indexOf(action) !== -1) {
      return magasinApiExecute_(action, request.payload, '');
    }

    if (MAGASIN_API_SESSION_ACTIONS_.indexOf(action) === -1) {
      return magasinApiJson_(false, 'Action không được phép.');
    }

    const sessionToken = String(
      request.sessionToken ||
      (request.payload && request.payload.sessionToken) ||
      ''
    ).trim();

    if (!sessionToken) {
      return magasinApiJson_(false, 'Thiếu sessionToken.');
    }

    if (!requireSessionUser_(sessionToken)) {
      return magasinApiJson_(false, 'Phiên đăng nhập không tồn tại hoặc đã hết hạn.');
    }

    return magasinApiExecute_(action, request.payload, sessionToken);

  } catch (err) {
    console.error(err);
    return magasinApiJson_(false, 'API error: ' + String(err && err.message || err));
  }
}

function magasinApiParseRequest_(e) {
  let raw = '';

  if (e && e.postData && typeof e.postData.contents === 'string') {
    raw = e.postData.contents.trim();
  }

  if (!raw && e && e.parameter && e.parameter.payload) {
    raw = String(e.parameter.payload).trim();
  }

  if (!raw) {
    return {action:'', sessionToken:'', payload:{}};
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    try {
      parsed = JSON.parse(decodeURIComponent(raw));
    } catch (err2) {
      throw new Error('Request body không phải JSON hợp lệ.');
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Request payload không hợp lệ.');
  }

  return {
    action: String(parsed.action || '').trim(),
    sessionToken: String(parsed.sessionToken || '').trim(),
    payload: parsed.payload && typeof parsed.payload === 'object'
      ? parsed.payload
      : {}
  };
}

function magasinApiExecute_(action, payload, sessionToken) {
  const fn = globalThis[action];

  if (typeof fn !== 'function') {
    return magasinApiJson_(false, 'Backend chưa có hàm: ' + action);
  }

  const args = magasinApiBuildArgs_(action, payload || {}, sessionToken);
  const result = fn.apply(null, args);

  if (result === undefined) {
    return magasinApiJson_(true, '', null);
  }

  return magasinApiJson_(
    !(result && result.ok === false),
    result && result.message ? String(result.message) : '',
    result
  );
}

function magasinApiBuildArgs_(action, payload, sessionToken) {
  const p = payload || {};

  switch (action) {
    /* ---------- PUBLIC ---------- */
    case 'login':
    case 'registerUser':
    case 'verifyEmail':
    case 'requestPasswordReset':
    case 'resetPassword':
      return [p];

    /* ---------- SESSION ONLY ---------- */
    case 'getSession':
    case 'logout':
    case 'getMyAccess':
    case 'getCurrentEmployeeProfile':
    case 'getMySchedule':
    case 'getAttendanceOptions':
    case 'getMyShiftSwapRequests':
    case 'getMyKpi':
      return [sessionToken];

    /* ---------- SESSION + FORM ---------- */
    case 'updateCurrentEmployeeProfile':
    case 'changeCurrentEmployeePassword': {
      const form = Object.assign({}, p);
      form.token = sessionToken;
      return [form];
    }

    case 'getAttendanceHistory':
    case 'getAttendanceManagementV33':
    case 'getScheduleEmployeeOptions':
      return [sessionToken, p];

    case 'registerShift':
    case 'createAttendanceRecord':
    case 'updateAttendanceRecord':
    case 'submitShiftSwap':
    case 'approveSchedule':
    case 'assignSchedule':
    case 'managerUpdateAttendanceRecord':
    case 'managerDeleteAttendanceRecord':
      return [sessionToken, p];

    case 'getScheduleManagement':
      return [sessionToken, p];

    case 'cancelShift':
      return [sessionToken, p.id || p.scheduleId || p];

    default:
      return [p];
  }
}

function magasinApiJson_(ok, message, data) {
  const body = {
    ok: !!ok,
    message: message || ''
  };

  if (data !== undefined && data !== null) {
    body.data = data;
  }

  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
