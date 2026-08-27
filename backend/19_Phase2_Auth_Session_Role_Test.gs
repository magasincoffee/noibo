/* =========================================================
   MAGASIN — PHASE 2 AUTH / SESSION / ROLE TEST

   File test an toàn cho Apps Script editor.
   Không tạo dữ liệu người dùng mới và không thay đổi dữ liệu nghiệp vụ.

   Dùng để kiểm tra:
   - Spreadsheet nguồn chính.
   - SESSION_DURATION.
   - Ma trận page permission.
   - Ma trận capability theo 4 vai trò.
   - Tài khoản hiện tại có thể xác thực session nếu truyền username.
========================================================= */

function testPhase2AuthSessionRole() {
  const roles = ['STAFF','INVENTORY_MANAGER','STORE_MANAGER','OWNER'];

  const matrix = roles.map(function(role) {
    return {
      role: role,
      label: roleLabel_(role),
      pages: getRolePermissions_(role),
      capabilities: getRoleCapabilities_(role)
    };
  });

  const source = kiemTraNguonDuLieuMAGASIN_();

  return {
    ok: true,
    phase: 'PHASE_2_AUTH_SESSION_ROLE',
    sessionDurationSeconds: SESSION_DURATION,
    sessionDurationHours: SESSION_DURATION / 3600,
    source: source,
    roleMatrix: matrix
  };
}

/**
 * Kiểm tra một username có thể được đọc từ nguồn User Sheet và role hiện tại.
 * Không trả về mật khẩu/hash/salt.
 */
function testCurrentUserAuthState(username) {
  const target = clean_(username);
  if (!target) {
    return fail_('Vui lòng truyền username.');
  }

  const found = findUserRowByUsername_(target);
  if (!found || !found.row) {
    return fail_('Không tìm thấy username trong Sheet Người dùng.');
  }

  const row = found.row;
  const role = normalizeRole_(row[7]);
  const status = String(row[8] || '').toUpperCase();

  return {
    ok: true,
    username: String(row[1] || ''),
    name: String(row[2] || ''),
    role: role,
    roleLabel: roleLabel_(role),
    status: status,
    accessScope: String(row[15] || ''),
    active: status === 'ACTIVE',
    pages: getRolePermissions_(role),
    capabilities: getRoleCapabilities_(role)
  };
}
