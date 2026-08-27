/* =========================================================
   MAGASIN — QUẢN LÝ NGƯỜI DÙNG
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa các chức năng Chủ cửa hàng dùng để quản lý người dùng.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

function ensureUserHeaders_() {
  const sheet = getUsersSheet_();
  const current = sheet.getRange(1, 1, 1, USER_HEADERS.length).getValues()[0];
  USER_HEADERS.forEach(function(header, index) {
    if (String(current[index] || '') !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });
  return sheet;
}

function requireOwner_(token) {
  const auth = requireManagerRole_(token, '');

  if (!auth.ok) return auth;

  if (normalizeRole_(auth.user.role) !== 'OWNER') {
    return {
      ok:false,
      message:'Bạn không có quyền quản lý tài khoản.'
    };
  }

  return auth;
}

function getUsersForManagement(token) {
  const auth = requireOwner_(token);
  if (!auth.ok) return fail_(auth.message);

  const sheet = ensureUserHeaders_();
  const rows = sheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    users.push({
      id:String(row[0]),
      username:String(row[1] || ''),
      fullName:String(row[2] || ''),
      email:String(row[3] || ''),
      phone:String(row[4] || ''),
      role:normalizeRole_(row[7]),
      roleLabel:roleLabel_(row[7]),
      status:String(row[8] || ''),
      accessScope:String(row[15] || '')
    });
  }

  return {ok:true, users:users};
}

function updateManagedUser(form) {
  const token = String((form && form.token) || '');
  const auth = requireOwner_(token);
  if (!auth.ok) return fail_(auth.message);

  const id = clean_(form && form.id);
  const nextRole = normalizeRole_(form && form.role);
  const nextStatus = clean_(form && form.status).toUpperCase();
  const accessScope = clean_(form && form.accessScope);

  if (!id) return fail_('Không xác định được tài khoản cần cập nhật.');
  if (['ACTIVE','PENDING','INACTIVE'].indexOf(nextStatus) === -1) {
    return fail_('Trạng thái tài khoản không hợp lệ.');
  }

  const sheet = ensureUserHeaders_();
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  let target = null;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      rowIndex = i + 1;
      target = rows[i];
      break;
    }
  }

  if (rowIndex === -1) return fail_('Không tìm thấy tài khoản.');

  const currentRole = normalizeRole_(target[7]);
  const actorRole = normalizeRole_(auth.user.role);

  // Bảo vệ tài khoản OWNER: không cho đổi OWNER sang quyền khác từ giao diện thông thường.
  if (currentRole === 'OWNER' && actorRole !== 'OWNER') {
    return fail_('Không có quyền thay đổi tài khoản Chủ cửa hàng.');
  }
  if (currentRole === 'OWNER' && nextRole !== 'OWNER') {
    return fail_('Không thể hạ quyền tài khoản Chủ cửa hàng từ giao diện này.');
  }

  // Không cho tự vô hiệu hóa tài khoản OWNER đang đăng nhập.
  if (String(target[1]).toLowerCase() === String(auth.user.username).toLowerCase() &&
      nextStatus !== 'ACTIVE') {
    return fail_('Bạn không thể tự vô hiệu hóa tài khoản đang đăng nhập.');
  }

  sheet.getRange(rowIndex, 8).setValue(nextRole);
  sheet.getRange(rowIndex, 9).setValue(nextStatus);
  sheet.getRange(rowIndex, 16).setValue(accessScope);

  return {
    ok:true,
    message:'Đã cập nhật vai trò, trạng thái và phạm vi truy cập.',
    user:{
      id:id,
      username:String(target[1] || ''),
      fullName:String(target[2] || ''),
      email:String(target[3] || ''),
      role:nextRole,
      roleLabel:roleLabel_(nextRole),
      status:nextStatus,
      accessScope:accessScope
    }
  };
}
