/* =========================================================
   MAGASIN — KPI VÀ HIỆU SUẤT
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa dữ liệu KPI của nhân viên.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

function getMyKpi(token) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const sheet = getOperationalSheet_('KPI');
  const rows = sheet.getDataRange().getValues();
  const items = [];

  for (let i = rows.length - 1; i >= 1 && items.length < 100; i--) {
    const r = rows[i];
    if (String(r[2]).toLowerCase() !== user.username.toLowerCase()) continue;
    items.push({
      period:String(r[1] || ''),
      store:String(r[3] || ''),
      target:String(r[4] || ''),
      result:String(r[5] || ''),
      weight:Number(r[6] || 0),
      score:Number(r[7] || 0),
      evaluator:String(r[8] || ''),
      updatedAt:r[9] || '',
      note:String(r[10] || '')
    });
  }

  return {ok:true, items:items};
}
