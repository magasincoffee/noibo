/* =========================================================
   MAGASIN — ĐỔI CA
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa gửi và xem yêu cầu đổi ca.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

function submitShiftSwap(token, data) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const currentShift = clean_(data && data.currentShift);
  const requestedShift = clean_(data && data.requestedShift);
  const store = clean_(data && data.store);
  const reason = clean_(data && data.reason);

  if (!currentShift || !requestedShift || !store || !reason) {
    return fail_('Vui lòng nhập ca hiện tại, ca đề nghị, cửa hàng và lý do.');
  }
  if (!scopeAllows_(user.accessScope, store)) {
    return fail_('Bạn không có quyền gửi yêu cầu tại cửa hàng này.');
  }

  getOperationalSheet_('Đổi ca').appendRow([
    Utilities.getUuid(), new Date(), user.username, currentShift,
    requestedShift, store, reason, 'PENDING', '', '', ''
  ]);

  return {ok:true, message:'Đã gửi yêu cầu đổi ca. Vui lòng chờ quản lý duyệt.'};
}

function getMyShiftSwapRequests(token) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const sheet = getOperationalSheet_('Đổi ca');
  const rows = sheet.getDataRange().getValues();
  const items = [];

  for (let i = rows.length - 1; i >= 1 && items.length < 60; i--) {
    const r = rows[i];
    if (String(r[2]).toLowerCase() !== user.username.toLowerCase()) continue;
    items.push({
      id:String(r[0] || ''),
      date:r[1] || '',
      currentShift:String(r[3] || ''),
      requestedShift:String(r[4] || ''),
      store:String(r[5] || ''),
      reason:String(r[6] || ''),
      status:String(r[7] || ''),
      approver:String(r[8] || ''),
      approvedAt:r[9] || '',
      note:String(r[10] || '')
    });
  }

  return {ok:true, items:items};
}
