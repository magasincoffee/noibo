/* =========================================================
   MAGASIN — PHIÊN ĐĂNG NHẬP V3
   Session cache + rehydrate identity from canonical User Sheet.

   Mục tiêu PHASE 2:
   - Giữ token phiên trong CacheService.
   - Khi session còn sống, vẫn kiểm tra trạng thái/role/scope hiện tại
     của tài khoản từ Sheet "Người dùng".
   - Nếu tài khoản bị INACTIVE/PENDING hoặc không còn tồn tại:
     session bị hủy ngay.
   - Nếu role/scope/thông tin cá nhân thay đổi:
     session được cập nhật theo dữ liệu hiện tại.

   Lý do:
   Phiên cũ trước đây chỉ đọc snapshot user từ cache. Vì vậy khi Chủ
   cửa hàng đổi role/status trong Sheet, session đang sống có thể tiếp
   tục sử dụng quyền cũ cho đến khi cache hết hạn. V3 loại bỏ khoảng
   trống này bằng cách đồng bộ session với nguồn dữ liệu hiện tại.
========================================================= */

function createSession_(user) {
  const token = Utilities.getUuid();
  const normalized = normalizeSessionUser_(user);

  CacheService.getScriptCache().put(
    SESSION_PREFIX + token,
    JSON.stringify(normalized),
    SESSION_DURATION
  );

  return token;
}

/**
 * Đồng bộ snapshot session với Sheet "Người dùng".
 *
 * Trả về null nếu tài khoản không còn ACTIVE hoặc không tìm thấy.
 * Không đọc lại mật khẩu/hash vào session.
 */
function refreshSessionUser_(cachedUser) {
  if (!cachedUser || !cachedUser.username) return null;

  const found = findUserRowByUsername_(cachedUser.username);
  if (!found || !found.row) return null;

  const row = found.row;
  const status = String(row[8] || '').trim().toUpperCase();

  if (status !== 'ACTIVE') return null;

  const refreshed = {
    username: String(row[1] || '').trim(),
    name: String(row[2] || '').trim(),
    email: String(row[3] || '').trim(),
    phone: String(row[4] || '').trim(),
    role: normalizeRole_(row[7]),
    accessScope: String(row[15] || '').trim()
  };

  if (!refreshed.username) return null;

  return refreshed;
}

function normalizeSessionUser_(user) {
  const source = user || {};
  return {
    username: String(source.username || '').trim(),
    name: String(source.name || '').trim(),
    email: String(source.email || '').trim(),
    phone: String(source.phone || '').trim(),
    role: normalizeRole_(source.role),
    accessScope: String(source.accessScope || '').trim()
  };
}

/**
 * Lấy session hiện tại và đồng bộ với tài khoản thật.
 * Dùng cho F5/reload và mọi nơi cần xác nhận session còn hợp lệ.
 */
function getSession(token) {
  if (!token) return fail_('Phiên đăng nhập không tồn tại.');

  const cacheKey = SESSION_PREFIX + String(token);
  const raw = CacheService.getScriptCache().get(cacheKey);

  if (!raw) {
    return fail_('Phiên đăng nhập đã hết hạn.');
  }

  let cachedUser;
  try {
    cachedUser = JSON.parse(raw);
  } catch (err) {
    CacheService.getScriptCache().remove(cacheKey);
    return fail_('Phiên đăng nhập không hợp lệ.');
  }

  const user = refreshSessionUser_(cachedUser);

  if (!user) {
    CacheService.getScriptCache().remove(cacheKey);
    return fail_('Tài khoản không còn hoạt động hoặc không tồn tại. Vui lòng đăng nhập lại.');
  }

  CacheService.getScriptCache().put(
    cacheKey,
    JSON.stringify(user),
    SESSION_DURATION
  );

  return {
    ok: true,
    user: user,
    sessionToken: String(token),
    expiresIn: SESSION_DURATION
  };
}

function logout(token) {
  if (token) {
    CacheService.getScriptCache().remove(SESSION_PREFIX + token);
  }
  return {ok:true, message:'Đã đăng xuất.'};
}

/**
 * Guard server-side cho mọi nghiệp vụ yêu cầu session.
 *
 * Đây là điểm kiểm soát chính của PHASE 2:
 * - token phải tồn tại;
 * - cache phải parse được;
 * - tài khoản hiện tại phải ACTIVE;
 * - role/accessScope phải lấy từ nguồn dữ liệu hiện tại.
 */
function requireSessionUser_(token) {
  if (!token) return null;

  const cacheKey = SESSION_PREFIX + String(token);
  const raw = CacheService.getScriptCache().get(cacheKey);

  if (!raw) return null;

  let cachedUser;
  try {
    cachedUser = JSON.parse(raw);
  } catch (err) {
    CacheService.getScriptCache().remove(cacheKey);
    return null;
  }

  const user = refreshSessionUser_(cachedUser);

  if (!user) {
    CacheService.getScriptCache().remove(cacheKey);
    return null;
  }

  /* Gia hạn phiên theo cơ chế trượt. */
  CacheService.getScriptCache().put(
    cacheKey,
    JSON.stringify(user),
    SESSION_DURATION
  );

  return user;
}
