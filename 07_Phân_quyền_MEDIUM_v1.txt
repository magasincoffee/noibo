/* =========================================================
   MAGASIN — PHÂN QUYỀN VÀ PHẠM VI TRUY CẬP
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa chuẩn hóa vai trò, quyền và phạm vi truy cập.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

function normalizeRole_(role) {
  const value = clean_(role).toUpperCase();

  if (
    value === 'OWNER' ||
    value === 'CHỦ CỬA HÀNG' ||
    value === 'CHU CUA HANG'
  ) return 'OWNER';

  if (
    value === 'INVENTORY_MANAGER' ||
    value === 'QUẢN LÝ KHO' ||
    value === 'QUAN LY KHO'
  ) return 'INVENTORY_MANAGER';

  if (
    value === 'STORE_MANAGER' ||
    value === 'QUẢN LÝ CỬA HÀNG' ||
    value === 'QUAN LY CUA HANG' ||
    value === 'MANAGER' ||
    value === 'QUẢN LÝ' ||
    value === 'QUAN LY' ||
    value.indexOf('MANAGER') !== -1 ||
    value.indexOf('QUẢN LÝ') !== -1
  ) return 'STORE_MANAGER';

  return 'STAFF';
}

function requireManagerRole_(token, store) {
  const user = requireSessionUser_(token);

  if (!user) {
    return {
      ok: false,
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    };
  }

  const role = normalizeRole_(user.role);

  if (role !== 'OWNER' && role !== 'STORE_MANAGER') {
    return {
      ok: false,
      message: 'Bạn không có quyền quản lý.'
    };
  }

  if (role === 'OWNER') return {ok:true, user:user};

  if (store && !scopeAllows_(user.accessScope, store)) {
    const scopeText = String(user.accessScope || '').trim();

    return {
      ok: false,
      message: scopeText
        ? 'Bạn không có quyền thao tác tại cửa hàng ' +
          String(store) + '. Phạm vi hiện tại: ' + scopeText + '.'
        : 'Tài khoản quản lý chưa được cấu hình Phạm vi truy cập trong Sheet Người dùng (cột P).'
    };
  }

  return {ok:true, user:user};
}

function roleLabel_(role) {
  const normalized = normalizeRole_(role);
  if (normalized === 'OWNER') return 'Chủ cửa hàng';
  if (normalized === 'INVENTORY_MANAGER') return 'Quản lý kho';
  if (normalized === 'STORE_MANAGER') return 'Quản lý cửa hàng';
  return 'Nhân viên';
}

function getRolePermissions_(role) {
  const normalized = normalizeRole_(role);

  // Chủ cửa hàng: toàn bộ hệ thống.
  if (normalized === 'OWNER') {
    return ['dashboard','inventory','orders','reports','settings'];
  }

  // Quản lý kho: tập trung nghiệp vụ kho và báo cáo liên quan.
  if (normalized === 'INVENTORY_MANAGER') {
    return ['dashboard','inventory','reports'];
  }

  // Quản lý cửa hàng: vận hành cửa hàng, đơn hàng, kho và báo cáo.
  if (normalized === 'STORE_MANAGER') {
    return ['dashboard','inventory','orders','reports'];
  }

  // Nhân viên: chỉ các tác vụ cơ bản.
  // Chấm công, nhập tồn hàng hóa và kiểm kê dụng cụ
  // được hiển thị trong khu vực Kho hàng.
  return ['dashboard','inventory'];
}

function getMyAccess(token) {
  const user = requireSessionUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  return {
    ok:true,
    role:normalizeRole_(user.role),
    roleLabel:roleLabel_(user.role),
    accessScope:user.accessScope || '',
    pages:getRolePermissions_(user.role)
  };
}
