/* =========================================================
   MAGASIN — GITHUB FRONTEND BRIDGE
   ARCH-03

   GitHub Pages → postMessage → Apps Script HTML Service →
   google.script.run → business functions 01 → 15.

   Không dùng dynamic function invocation.
   Chỉ expose các action được xác định rõ bên dưới.
========================================================= */

const MAGASIN_BRIDGE_PUBLIC_ACTIONS_ = [
  'health',
  'login',
  'registerUser',
  'verifyEmail',
  'requestPasswordReset',
  'resetPassword'
];

const MAGASIN_BRIDGE_SESSION_ACTIONS_ = [
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

function magasinBridgeCall(action, payload, sessionToken) {
  const name = String(action || '').trim();
  const p = payload && typeof payload === 'object' ? payload : {};
  const token = String(sessionToken || '').trim();

  if (name === 'health') {
    return {
      ok: true,
      message: 'MAGASIN API đang hoạt động.',
      data: {
        service: 'magasin-noibo-bridge',
        version: '1.0',
        transport: 'HTML Service + postMessage',
        time: new Date().toISOString()
      }
    };
  }

  if (MAGASIN_BRIDGE_PUBLIC_ACTIONS_.indexOf(name) !== -1) {
    return magasinBridgeExecutePublic_(name, p);
  }

  if (MAGASIN_BRIDGE_SESSION_ACTIONS_.indexOf(name) === -1) {
    return {ok:false, message:'Action không được phép.'};
  }

  if (!token) {
    return {ok:false, message:'Thiếu sessionToken.'};
  }

  if (!requireSessionUser_(token)) {
    return {ok:false, message:'Phiên đăng nhập không tồn tại hoặc đã hết hạn.'};
  }

  return magasinBridgeExecuteSession_(name, p, token);
}

function magasinBridgeExecutePublic_(action, payload) {
  switch (action) {
    case 'login':
      return login(payload || {});
    case 'registerUser':
      return registerUser(payload || {});
    case 'verifyEmail':
      return verifyEmail(payload || {});
    case 'requestPasswordReset':
      return requestPasswordReset(payload || {});
    case 'resetPassword':
      return resetPassword(payload || {});
    default:
      return {ok:false, message:'Public action không được triển khai.'};
  }
}

function magasinBridgeExecuteSession_(action, payload, token) {
  const p = payload || {};

  switch (action) {
    case 'getSession':
      return getSession(token);
    case 'logout':
      return logout(token);
    case 'getMyAccess':
      return getMyAccess(token);
    case 'getCurrentEmployeeProfile':
      return getCurrentEmployeeProfile(token);
    case 'updateCurrentEmployeeProfile':
      return updateCurrentEmployeeProfile(Object.assign({}, p, {token:token}));
    case 'changeCurrentEmployeePassword':
      return changeCurrentEmployeePassword(Object.assign({}, p, {token:token}));
    case 'getMySchedule':
      return getMySchedule(token);
    case 'registerShift':
      return registerShift(token, p);
    case 'cancelShift':
      return cancelShift(token, p.id || p.scheduleId || p.value || p);
    case 'getAttendanceOptions':
      return getAttendanceOptions(token);
    case 'createAttendanceRecord':
      return createAttendanceRecord(token, p);
    case 'updateAttendanceRecord':
      return updateAttendanceRecord(token, p);
    case 'getAttendanceHistory':
      return getAttendanceHistory(token, p);
    case 'submitShiftSwap':
      return submitShiftSwap(token, p);
    case 'getMyShiftSwapRequests':
      return getMyShiftSwapRequests(token);
    case 'getMyKpi':
      return getMyKpi(token);
    default:
      return {ok:false, message:'Session action không được triển khai.'};
  }
}
