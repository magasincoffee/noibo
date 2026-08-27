/* =========================================================
   MAGASIN — PHIÊN ĐĂNG NHẬP V2
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa tạo, đọc, xóa và kiểm tra phiên đăng nhập.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

function createSession_(user) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(
    SESSION_PREFIX + token,
    JSON.stringify(user),
    SESSION_DURATION
  );
  return token;
}

function getSession(token) {
  if (!token) return fail_('Phiên đăng nhập không tồn tại.');

  const cacheKey = SESSION_PREFIX + String(token);
  const data = CacheService.getScriptCache().get(cacheKey);

  if (!data) {
    return fail_('Phiên đăng nhập đã hết hạn.');
  }

  let user;
  try {
    user = JSON.parse(data);
  } catch (err) {
    CacheService.getScriptCache().remove(cacheKey);
    return fail_('Phiên đăng nhập không hợp lệ.');
  }

  /*
   * Gia hạn phiên theo cơ chế trượt mỗi khi WebApp được tải lại.
   * Người dùng vẫn phải đăng nhập lại sau khi phiên không còn tồn tại,
   * nhưng F5/reload trong thời gian sử dụng sẽ không làm mất phiên.
   */
  CacheService.getScriptCache().put(
    cacheKey,
    JSON.stringify(user),
    SESSION_DURATION
  );

  return {
    ok:true,
    user:user,
    sessionToken:String(token),
    expiresIn:SESSION_DURATION
  };
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove(SESSION_PREFIX + token);
  return {ok:true, message:'Đã đăng xuất.'};
}

function requireSessionUser_(token) {
  if (!token) return null;

  const cacheKey = SESSION_PREFIX + String(token);
  const raw = CacheService.getScriptCache().get(cacheKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (err) {
    CacheService.getScriptCache().remove(cacheKey);
    return null;
  }
}
