/* =========================================================
   MAGASIN — KHO HÀNG
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   File khung dành cho module Kho hàng. File nguồn hiện tại chưa có hàm nghiệp vụ kho độc lập nên không tự thêm logic.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

/*
   MODULE CHƯA CÓ HÀM NGHIỆP VỤ TRONG FILE NGUỒN HIỆN TẠI.
   Khi phát triển Kho hàng, chỉ thêm hàm vào file này.
*/

/**
 * ARCH-02 — Stub an toàn cho module Kho hàng.
 * Module nghiệp vụ thật chưa được triển khai nên frontend không được
 * giả định rằng các thao tác nhập/xuất/kiểm kê đã có backend.
 */
function getInventoryModuleStatus(token) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  return {
    ok: true,
    implemented: false,
    message: 'Module Kho hàng chưa được triển khai nghiệp vụ backend.',
    role: user.role
  };
}
