/* =========================================================
   MAGASIN — KHÔI PHỤC MẬT KHẨU
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa khôi phục mật khẩu, mật khẩu tạm thời và đặt lại mật khẩu.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

function requestPasswordReset(form) {
  const email = clean_(form && form.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail_('Vui lòng nhập email hợp lệ.');
  }

  const sheet = getUsersSheet_();
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  let row = null;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][3]).toLowerCase() === email) {
      rowIndex = i + 1;
      row = rows[i];
      break;
    }
  }

  /* Không tiết lộ email có tồn tại hay không */
  const safeMessage = 'Nếu email đã được đăng ký, hướng dẫn khôi phục mật khẩu đã được gửi đến email của bạn.';
  if (rowIndex === -1) return {ok:true, message:safeMessage};

  if (String(row[8]) !== 'ACTIVE') {
    return fail_('Tài khoản này hiện chưa thể khôi phục mật khẩu.');
  }

  const temporaryPassword = generateTemporaryPassword_();
  const passwordSalt = Utilities.getUuid();
  const newHash = hash_(temporaryPassword + passwordSalt);

  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  const resetData = {
    email: email,
    rowIndex: rowIndex,
    expiresAt: Date.now() + PASSWORD_RESET_DURATION * 1000
  };

  const webAppUrl = ScriptApp.getService().getUrl();
  if (!webAppUrl) {
    return fail_('Chưa lấy được địa chỉ Web App để tạo link đặt lại mật khẩu.');
  }

  const resetLink = webAppUrl + '?reset=' + encodeURIComponent(token);

  const plainBody =
    'Xin chào ' + row[2] + ',\n\n' +
    'Bạn đã yêu cầu khôi phục mật khẩu MAGASIN.\n\n' +
    'Mật khẩu tạm thời: ' + temporaryPassword + '\n\n' +
    'Tạo mật khẩu mới tại: ' + resetLink + '\n\n' +
    'Link có hiệu lực trong 30 phút. Nếu bạn không yêu cầu khôi phục mật khẩu, hãy liên hệ quản trị viên ngay.';

  const htmlBody =
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">' +
    '<h2 style="margin:0 0 16px">Khôi phục mật khẩu MAGASIN</h2>' +
    '<p>Xin chào <strong>' + escapeHtml_(row[2]) + '</strong>,</p>' +
    '<p>Bạn đã yêu cầu khôi phục mật khẩu.</p>' +
    '<p><strong>Mật khẩu tạm thời của bạn:</strong><br>' +
    '<span style="display:inline-block;padding:10px 14px;background:#eef8f8;border-radius:8px;font-size:18px;letter-spacing:1px">' +
    escapeHtml_(temporaryPassword) + '</span></p>' +
    '<p>Để tạo mật khẩu mới, hãy mở link sau:</p>' +
    '<p><a href="' + resetLink + '" style="display:inline-block;padding:12px 18px;background:#10b6c7;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Tạo mật khẩu mới</a></p>' +
    '<p style="font-size:13px;color:#64748b">Link có hiệu lực trong 30 phút. Nếu bạn không yêu cầu khôi phục mật khẩu, hãy liên hệ quản trị viên.</p>' +
    '</div>';

  // CRITICAL-04: gửi email trước khi thay đổi mật khẩu trong Sheet.
  try {
    GmailApp.sendEmail(email, 'MAGASIN – Khôi phục mật khẩu', plainBody, {
      htmlBody: htmlBody
    });
  } catch(emailErr) {
    return fail_('Không gửi được email khôi phục mật khẩu. Vui lòng thử lại: '+String(emailErr&&emailErr.message||emailErr));
  }

  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet.getRange(rowIndex, 6).setValue(passwordSalt);
      sheet.getRange(rowIndex, 7).setValue(newHash);
      CacheService.getScriptCache().put(
        PASSWORD_RESET_PREFIX + hash_(token),
        JSON.stringify(resetData),
        PASSWORD_RESET_DURATION
      );
      SpreadsheetApp.flush();
    } finally {
      try { lock.releaseLock(); } catch(e) {}
    }
  } catch(err) {
    return fail_('Email khôi phục đã được gửi nhưng chưa thể cập nhật mật khẩu. Vui lòng yêu cầu khôi phục lại nếu cần. Chi tiết: '+String(err&&err.message||err));
  }

  return {ok:true, message:safeMessage};
}

function resetPassword(form) {
  const token = String((form && form.token) || '');
  const password = String((form && form.password) || '');
  const confirmPassword = String((form && form.confirmPassword) || '');

  if (!token) return fail_('Link tạo mật khẩu mới không hợp lệ.');
  if (password.length < 8) return fail_('Mật khẩu mới cần tối thiểu 8 ký tự.');
  if (password !== confirmPassword) return fail_('Mật khẩu nhập lại chưa trùng khớp.');

  const key = PASSWORD_RESET_PREFIX + hash_(token);
  const cache = CacheService.getScriptCache();
  const raw = cache.get(key);

  if (!raw) return fail_('Link đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu khôi phục lại mật khẩu.');

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return fail_('Dữ liệu khôi phục không hợp lệ.');
  }

  if (!data || !data.email || !data.rowIndex || Number(data.expiresAt) < Date.now()) {
    cache.remove(key);
    return fail_('Link đã hết hạn. Vui lòng yêu cầu khôi phục lại mật khẩu.');
  }

  const sheet = getUsersSheet_();
  const row = sheet.getRange(Number(data.rowIndex), 1, 1, USER_HEADERS.length).getValues()[0];

  if (!row || String(row[3]).toLowerCase() !== String(data.email).toLowerCase()) {
    cache.remove(key);
    return fail_('Không tìm thấy tài khoản cần đặt lại mật khẩu.');
  }

  const passwordSalt = Utilities.getUuid();
  sheet.getRange(Number(data.rowIndex), 6).setValue(passwordSalt);
  sheet.getRange(Number(data.rowIndex), 7).setValue(hash_(password + passwordSalt));

  /* Token chỉ được sử dụng một lần */
  cache.remove(key);

  return {ok:true, message:'Mật khẩu mới đã được tạo thành công.'};
}

function generateTemporaryPassword_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values = [];
  for (let i = 0; i < 12; i++) {
    values.push(chars.charAt(Math.floor(Math.random() * chars.length)));
  }
  return values.join('');
}
