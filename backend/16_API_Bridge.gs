/* =========================================================
   MAGASIN — API BRIDGE
   ARCH-02 / GitHub Frontend → Apps Script Backend

   Mục tiêu:
   - Giữ nguyên các module nghiệp vụ hiện có.
   - Thêm HTTP POST endpoint cho frontend chạy trên GitHub Pages.
   - Chỉ expose các action đã được xác định rõ.
   - Không dùng dynamic eval/function name từ request.

   Request body:
   {
     "action": "login",
     "sessionToken": "...",
     "payload": { ... }
   }

   Client dùng POST text/plain với JSON.stringify(...)
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
  'getMyKpi'
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
        version: '1.1',
        time: new Date().toISOString()
      });
    }

    if (MAGASIN_API_PUBLIC_ACTIONS_.indexOf(action) !== -1) {
      return magasinApiExecutePublic_(action, request.payload);
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

    return magasinApiExecuteSession_(action, request.payload, sessionToken);

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

function magasinApiExecutePublic_(action, payload) {
  const p = payload || {};

  switch (action) {
    case 'login':
      return magasinApiWrapResult_(login(p));
    case 'registerUser':
      return magasinApiWrapResult_(registerUser(p));
    case 'verifyEmail':
      return magasinApiWrapResult_(verifyEmail(p));
    case 'requestPasswordReset':
      return magasinApiWrapResult_(requestPasswordReset(p));
    case 'resetPassword':
      return magasinApiWrapResult_(resetPassword(p));
    default:
      return magasinApiJson_(false, 'Public action không được triển khai.');
  }
}

function magasinApiExecuteSession_(action, payload, token) {
  const p = payload || {};

  switch (action) {
    case 'getSession':
      return magasinApiWrapResult_(getSession(token));

    case 'logout':
      return magasinApiWrapResult_(logout(token));

    case 'getMyAccess':
      return magasinApiWrapResult_(getMyAccess(token));

    case 'getCurrentEmployeeProfile':
      return magasinApiWrapResult_(getCurrentEmployeeProfile(token));

    case 'updateCurrentEmployeeProfile': {
      const form = Object.assign({}, p, {token: token});
      return magasinApiWrapResult_(updateCurrentEmployeeProfile(form));
    }

    case 'changeCurrentEmployeePassword': {
      const form = Object.assign({}, p, {token: token});
      return magasinApiWrapResult_(changeCurrentEmployeePassword(form));
    }

    case 'getMySchedule':
      return magasinApiWrapResult_(getMySchedule(token));

    case 'registerShift':
      return magasinApiWrapResult_(registerShift(token, p));

    case 'cancelShift':
      return magasinApiWrapResult_(
        cancelShift(token, p.id || p.scheduleId || p.value || p)
      );

    case 'getAttendanceOptions':
      return magasinApiWrapResult_(getAttendanceOptions(token));

    case 'createAttendanceRecord':
      return magasinApiWrapResult_(createAttendanceRecord(token, p));

    case 'updateAttendanceRecord':
      return magasinApiWrapResult_(updateAttendanceRecord(token, p));

    case 'getAttendanceHistory':
      return magasinApiWrapResult_(getAttendanceHistory(token, p));

    case 'submitShiftSwap':
      return magasinApiWrapResult_(submitShiftSwap(token, p));

    case 'getMyShiftSwapRequests':
      return magasinApiWrapResult_(getMyShiftSwapRequests(token));

    case 'getMyKpi':
      return magasinApiWrapResult_(getMyKpi(token));

    default:
      return magasinApiJson_(false, 'Session action không được triển khai.');
  }
}

function magasinApiWrapResult_(result) {
  if (result === undefined) {
    return magasinApiJson_(true, '', null);
  }

  return magasinApiJson_(
    !(result && result.ok === false),
    result && result.message ? String(result.message) : '',
    result
  );
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
