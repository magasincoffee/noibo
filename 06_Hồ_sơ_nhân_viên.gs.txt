/* =========================================================
   MAGASIN — HỒ SƠ NHÂN VIÊN
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa hồ sơ cá nhân và đổi mật khẩu của người dùng.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

function findUserRowByUsername_(username) {
  const sheet = getUsersSheet_();
  const rows = sheet.getDataRange().getValues();
  const target = clean_(username).toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === target) {
      return {
        sheet: sheet,
        rowIndex: i + 1,
        row: rows[i]
      };
    }
  }
  return null;
}

function getCurrentEmployeeProfile(token) {
  const user = requireSessionUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const found = findUserRowByUsername_(user.username);
  if (!found) return fail_('Không tìm thấy thông tin nhân viên.');

  const row = found.row;
  return {
    ok: true,
    profile: {
      username: row[1],
      fullName: row[2],
      email: row[3],
      phone: row[4],
      role: row[7],
      status: row[8],
        accessScope: row[15] || ''
    }
  };
}

function updateCurrentEmployeeProfile(form) {
  const token = String((form && form.token) || '');
  const user = requireSessionUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const fullName = clean_(form && form.fullName);
  const phone = clean_(form && form.phone).replace(/[.\s-]/g, '');

  if (fullName.length < 2) return fail_('Vui lòng nhập họ tên hợp lệ.');
  if (!/^(?:\+84|84|0)\d{9,10}$/.test(phone)) {
    return fail_('Số điện thoại Việt Nam chưa hợp lệ.');
  }

  const found = findUserRowByUsername_(user.username);
  if (!found) return fail_('Không tìm thấy tài khoản.');

  found.sheet.getRange(found.rowIndex, 3).setValue(fullName);
  found.sheet.getRange(found.rowIndex, 5).setValue(phone);

  /* Đồng bộ dữ liệu trong phiên hiện tại */
  user.name = fullName;
  user.phone = phone;
  CacheService.getScriptCache().put(
    SESSION_PREFIX + token,
    JSON.stringify(user),
    SESSION_DURATION
  );

  return {
    ok: true,
    message: 'Thông tin nhân viên đã được cập nhật.',
    user: user
  };
}

function changeCurrentEmployeePassword(form) {
  const token = String((form && form.token) || '');
  const currentPassword = String((form && form.currentPassword) || '');
  const newPassword = String((form && form.newPassword) || '');
  const confirmPassword = String((form && form.confirmPassword) || '');

  const user = requireSessionUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  if (!currentPassword) return fail_('Vui lòng nhập mật khẩu hiện tại hoặc mật khẩu tạm thời.');
  if (newPassword.length < 8) return fail_('Mật khẩu mới cần tối thiểu 8 ký tự.');
  if (newPassword !== confirmPassword) return fail_('Mật khẩu nhập lại chưa trùng khớp.');
  if (currentPassword === newPassword) return fail_('Mật khẩu mới cần khác mật khẩu hiện tại.');

  const found = findUserRowByUsername_(user.username);
  if (!found) return fail_('Không tìm thấy tài khoản.');

  const row = found.row;
  if (hash_(currentPassword + row[5]) !== row[6]) {
    return fail_('Mật khẩu hiện tại hoặc mật khẩu tạm thời không đúng.');
  }

  const passwordSalt = Utilities.getUuid();
  found.sheet.getRange(found.rowIndex, 6).setValue(passwordSalt);
  found.sheet.getRange(found.rowIndex, 7).setValue(hash_(newPassword + passwordSalt));

  return {
    ok: true,
    message: 'Đổi mật khẩu thành công. Mật khẩu mới có hiệu lực ngay.'
  };
}
