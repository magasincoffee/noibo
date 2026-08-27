/* =========================================================
   MAGASIN — PHÂN QUYỀN VÀ PHẠM VI TRUY CẬP V2

   PHASE 2 — AUTH + SESSION + ROLE
   - Chuẩn hóa quyền trang theo 4 vai trò.
   - Bổ sung capability keys để frontend có thể dùng cùng một nguồn
     quyền với backend.
   - Giữ nguyên các hàm hiện tại để không phá lời gọi cũ.
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

/*
 * Quyền theo PAGE.
 * Đây là nguồn quyền trang canonical cho toàn bộ frontend/backend.
 *
 * STAFF:
 * - dashboard: Tổng quan
 * - inventory: khu vực Tồn hàng / tác vụ cơ bản
 * - account: thông tin cá nhân
 *
 * STORE_MANAGER:
 * - dashboard, inventory, attendance, orders, reports, account
 *
 * INVENTORY_MANAGER:
 * - dashboard, inventory, reports, account
 *
 * OWNER:
 * - dashboard, inventory, attendance, orders, reports, settings, account
 */
function getRolePermissions_(role) {
  const normalized = normalizeRole_(role);

  if (normalized === 'OWNER') {
    return [
      'dashboard',
      'inventory',
      'attendance',
      'orders',
      'reports',
      'settings',
      'account'
    ];
  }

  if (normalized === 'STORE_MANAGER') {
    return [
      'dashboard',
      'inventory',
      'attendance',
      'orders',
      'reports',
      'account'
    ];
  }

  if (normalized === 'INVENTORY_MANAGER') {
    return [
      'dashboard',
      'inventory',
      'reports',
      'account'
    ];
  }

  return [
    'dashboard',
    'inventory',
    'account'
  ];
}

/*
 * Capability keys.
 * Trang = nơi hiển thị.
 * Capability = hành động được phép thực hiện.
 *
 * Backend nên dùng capability để kiểm soát nghiệp vụ khi module
 * tương ứng được hoàn thiện. Frontend có thể dùng cùng response này
 * để dựng Drawer/menu mà không phải tự đoán quyền.
 */
function getRoleCapabilities_(role) {
  const normalized = normalizeRole_(role);

  const STAFF = [
    'dashboard.view',
    'schedule.view',
    'schedule.register',
    'attendance.self',
    'shift_swap.self',
    'inventory.self',
    'account.view',
    'account.update'
  ];

  const INVENTORY_MANAGER = [
    'dashboard.view',
    'inventory.view',
    'inventory.manage',
    'reports.view',
    'account.view',
    'account.update'
  ];

  const STORE_MANAGER = [
    'dashboard.view',
    'schedule.view',
    'schedule.manage',
    'schedule.approve',
    'attendance.view',
    'attendance.manage',
    'inventory.view',
    'inventory.manage',
    'orders.view',
    'orders.manage',
    'reports.view',
    'account.view',
    'account.update'
  ];

  const OWNER = [
    'dashboard.view',
    'schedule.view',
    'schedule.manage',
    'schedule.approve',
    'attendance.view',
    'attendance.manage',
    'inventory.view',
    'inventory.manage',
    'orders.view',
    'orders.manage',
    'reports.view',
    'users.manage',
    'settings.manage',
    'account.view',
    'account.update'
  ];

  if (normalized === 'OWNER') return OWNER;
  if (normalized === 'STORE_MANAGER') return STORE_MANAGER;
  if (normalized === 'INVENTORY_MANAGER') return INVENTORY_MANAGER;
  return STAFF;
}

function hasRoleCapability_(role, capability) {
  const target = clean_(capability);
  if (!target) return false;
  return getRoleCapabilities_(role).indexOf(target) !== -1;
}

function requireCapability_(token, capability, store) {
  const user = requireSessionUser_(token);

  if (!user) {
    return {
      ok:false,
      message:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    };
  }

  if (!hasRoleCapability_(user.role, capability)) {
    return {
      ok:false,
      message:'Tài khoản không có quyền thực hiện thao tác này.'
    };
  }

  if (store && normalizeRole_(user.role) !== 'OWNER') {
    if (!scopeAllows_(user.accessScope, store)) {
      const scopeText = String(user.accessScope || '').trim();
      return {
        ok:false,
        message: scopeText
          ? 'Bạn không có quyền thao tác tại cửa hàng ' +
            String(store) + '. Phạm vi hiện tại: ' + scopeText + '.'
          : 'Tài khoản chưa được cấu hình Phạm vi truy cập.'
      };
    }
  }

  return {ok:true, user:user};
}

function getMyAccess(token) {
  const user = requireSessionUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const role = normalizeRole_(user.role);

  return {
    ok:true,
    role:role,
    roleLabel:roleLabel_(role),
    accessScope:user.accessScope || '',
    pages:getRolePermissions_(role),
    capabilities:getRoleCapabilities_(role)
  };
}
