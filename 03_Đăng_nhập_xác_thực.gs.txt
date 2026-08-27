/* =========================================================
   MAGASIN — ĐĂNG NHẬP VÀ XÁC THỰC
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa đăng ký tài khoản, xác thực email và đăng nhập.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

function registerUser(form) {
  const username = clean_(form && form.username).toLowerCase();
  const fullName = clean_(form && form.fullName);
  const email = clean_(form && form.email).toLowerCase();
  const phone = clean_(form && form.phone).replace(/[.\s-]/g, '');
  const password = String((form && form.password) || '');
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return fail_('Tên đăng nhập gồm 3–30 ký tự: chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang.');
  if (fullName.length < 2) return fail_('Vui lòng nhập họ tên.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail_('Email chưa hợp lệ.');
  if (!/^(?:\+84|84|0)\d{9,10}$/.test(phone)) return fail_('Số điện thoại Việt Nam chưa hợp lệ.');
  if (password.length < 8) return fail_('Mật khẩu cần tối thiểu 8 ký tự.');
  const sheet = getUsersSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === username || String(rows[i][3]).toLowerCase() === email) return fail_('Tên đăng nhập hoặc email đã được sử dụng.');
  }
  const passwordSalt = Utilities.getUuid();
  const verifySalt = Utilities.getUuid();
  const verifyCode = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  sheet.appendRow([Utilities.getUuid(), username, fullName, email, phone, passwordSalt, hash_(password + passwordSalt), 'STAFF', 'PENDING', verifySalt, hash_(verifyCode + verifySalt), expires, 0, new Date(), '', '']);
  GmailApp.sendEmail(email, 'BrewFlow – Mã xác thực tài khoản', 'Xin chào ' + fullName + ',\n\nMã xác thực BrewFlow của bạn là: ' + verifyCode + '\nMã có hiệu lực trong 15 phút.\n\nNếu bạn không đăng ký, hãy bỏ qua email này.');
  return {ok:true, email:email, message:'Mã xác thực đã được gửi đến email của bạn.'};
}

function verifyEmail(form) {
  const email = clean_(form && form.email).toLowerCase();
  const code = String((form && form.code) || '').replace(/\D/g, '');
  if (!email || code.length !== 6) return fail_('Vui lòng nhập email và mã gồm 6 chữ số.');
  const sheet = getUsersSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[3]).toLowerCase() !== email) continue;
    if (row[8] === 'ACTIVE') return {ok:true, message:'Email này đã được xác thực. Bạn có thể đăng nhập.'};
    if (row[8] !== 'PENDING') return fail_('Tài khoản hiện không thể xác thực.');
    if (Number(row[12]) >= 5) return fail_('Bạn đã nhập sai quá nhiều lần. Hãy đăng ký lại.');
    if (new Date(row[11]).getTime() < Date.now()) return fail_('Mã đã hết hạn. Hãy đăng ký lại để nhận mã mới.');
    if (hash_(code + row[9]) !== row[10]) { sheet.getRange(i + 1, 13).setValue(Number(row[12]) + 1); return fail_('Mã xác thực không đúng.'); }
    sheet.getRange(i + 1, 9).setValue('ACTIVE');
    sheet.getRange(i + 1, 15).setValue(new Date());
    return {ok:true, message:'Xác thực thành công. Bạn có thể đăng nhập.'};
  }
  return fail_('Không tìm thấy tài khoản này.');
}

function login(credentials) {
  const username = clean_(credentials && credentials.username).toLowerCase();
  const password = String((credentials && credentials.password) || '');
  if (!username || !password) return fail_('Vui lòng nhập tên đăng nhập và mật khẩu.');

  // HIGH-04: giới hạn brute-force đăng nhập theo tên tài khoản.
  // Tối đa 5 lần thử sai trong 15 phút.
  const attemptKey = LOGIN_ATTEMPT_PREFIX + hash_(username);
  const cache = CacheService.getScriptCache();
  const attempts = Number(cache.get(attemptKey) || 0);

  if (attempts >= LOGIN_ATTEMPT_MAX) {
    return fail_('Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.');
  }

  const rows = getUsersSheet_().getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[1]).toLowerCase() !== username) continue;

    if (row[8] === 'PENDING') return fail_('Tài khoản chưa xác thực email.');
    if (row[8] !== 'ACTIVE') return fail_('Tài khoản hiện không hoạt động.');

    if (hash_(password + row[5]) !== row[6]) {
      const nextAttempts = attempts + 1;
      cache.put(attemptKey, String(nextAttempts), LOGIN_ATTEMPT_DURATION);

      if (nextAttempts >= LOGIN_ATTEMPT_MAX) {
        return fail_('Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.');
      }

      return fail_('Tên đăng nhập hoặc mật khẩu không đúng.');
    }

    // Đăng nhập thành công → xóa bộ đếm sai.
    cache.remove(attemptKey);

    const user = {
      username: row[1],
      name: row[2],
      email: row[3],
      phone: row[4],
      role: normalizeRole_(row[7]),
      accessScope: row[15] || ''
    };

    const sessionToken = createSession_(user);
    return {
      ok:true,
      message:'Đăng nhập thành công. Chào ' + row[2] + '!',
      user:user,
      sessionToken:sessionToken
    };
  }

  // Không tiết lộ tài khoản có tồn tại hay không, đồng thời vẫn rate-limit.
  const nextAttempts = attempts + 1;
  cache.put(attemptKey, String(nextAttempts), LOGIN_ATTEMPT_DURATION);

  if (nextAttempts >= LOGIN_ATTEMPT_MAX) {
    return fail_('Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.');
  }

  return fail_('Tên đăng nhập hoặc mật khẩu không đúng.');
}
