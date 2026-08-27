/* =========================================================
   MAGASIN — API BRIDGE
   ARCH-02 / GitHub Frontend → Apps Script Backend

   Mục tiêu:
   - Giữ nguyên các module nghiệp vụ 01 → 15.
   - Thêm HTTP endpoint cho frontend chạy ngoài HTML Service.
   - Chỉ cho phép action nằm trong allowlist.
   - Login không cần session; các action còn lại phải mang sessionToken.

   Gọi từ GitHub Frontend:
   POST application/x-www-form-urlencoded hoặc text/plain
   body = JSON.stringify({ action: 'login', payload: {...} })

   LƯU Ý CORS:
   - Apps Script Web Apps chỉ có doGet/doPost.
   - Client bridge dùng POST body text/plain để tránh preflight OPTIONS.
   - Không thêm custom request headers từ trình duyệt.
========================================================= */

const MAGASIN_API_PUBLIC_ACTIONS_ = [
  'health',
  'login',
  'registerUser',
  'verifyEmail',
  'forgotPassword',
  'resetPassword'
];

const MAGASIN_API_SESSION_ACTIONS_ = [
  'getSession',
  'logout',
  'getMyAccess',
  'getMyProfile',
  'updateMyProfile',
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
  'getManagementScheduleV33',
  'approveSchedule',
  'assignSchedule',
  'getAttendanceManagementV33',
  'managerUpdateAttendanceRecord',
  'managerDeleteAttendanceRecord'
];

function doPost(e) {
  try {
    const request = magasinApiParseRequest_(e);

    if (!request.action) {
      return magasinApiJson_(false, 'Thiếu action.');
    }

    if (request.action === 'health') {
      return magasinApiJson_(true, 'MAGASIN API đang hoạt động.', {
        service: 'magasin-noibo-api',
        version: '1.0',
        time: new Date().toISOString()
      });
    }

    if (MAGASIN_API_PUBLIC_ACTIONS_.indexOf(request.action) !== -1) {
      return magasinApiExecute_(request.action, request.payload);
    }

    if (MAGASIN_API_SESSION_ACTIONS_.indexOf(request.action) === -1) {
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

    return magasinApiExecute_(
      request.action,
      request.payload,
      sessionToken
    );

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
    return { action: '', payload: {}, sessionToken: '' };
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
    payload: (parsed.payload && typeof parsed.payload === 'object')
      ? parsed.payload
      : {},
    sessionToken: String(parsed.sessionToken || '').trim()
  };
}

function magasinApiExecute_(action, payload, sessionToken) {
  const args = magasinApiBuildArgs_(action, payload, sessionToken);
  const fn = globalThis[action];

  if (typeof fn !== 'function') {
    return magasinApiJson_(false, 'Backend chưa có hàm: ' + action);
  }

  const result = fn.apply(null, args);

  if (result === undefined) {
    return magasinApiJson_(true, '', null);
  }

  return magasinApiJson_(
    result && result.ok !== false,
    result && result.message ? String(result.message) : '',
    result
  );
}

function magasinApiBuildArgs_(action, payload, sessionToken) {
  const p = payload || {};

  switch (action) {
    case 'login':
    case 'registerUser':
    case 'verifyEmail':
    case 'forgotPassword':
    case 'resetPassword':
      return [p];

    case 'getSession':
    case 'logout':
    case 'getMyAccess':
    case 'getMyProfile':
    case 'updateMyProfile':
    case 'getMySchedule':
    case 'getAttendanceOptions':
    case 'getAttendanceHistory':
    case 'getMyShiftSwapRequests':
    case 'getMyKpi':
    case 'getManagementScheduleV33':
    case 'getAttendanceManagementV33':
      return [sessionToken, p];

    case 'registerShift':
    case 'cancelShift':
    case 'createAttendanceRecord':
    case 'updateAttendanceRecord':
    case 'submitShiftSwap':
    case 'approveSchedule':
    case 'assignSchedule':
    case 'managerUpdateAttendanceRecord':
    case 'managerDeleteAttendanceRecord':
      return [sessionToken, p];

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
