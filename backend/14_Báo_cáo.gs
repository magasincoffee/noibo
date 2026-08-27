/* =========================================================
   MAGASIN — BÁO CÁO
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa báo cáo chấm công tổng hợp theo ngày, chi nhánh và khoảng thời gian.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

/* Module 14 — Báo cáo: chỉ wrapper; logic chấm công quản lý nằm duy nhất ở module 10. */
function getAttendanceReport(token, filters){
  return getAttendanceManagementV33(token, filters);
}
