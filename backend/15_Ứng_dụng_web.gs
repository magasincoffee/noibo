/* =========================================================
   MAGASIN — ỨNG DỤNG WEB
   ARCH-01 / Mobile Final
========================================================= */

function doGet(e) {
  ensureOperationalSheets_();

  /* ARCH-03: endpoint HTML Service dùng làm bridge cho GitHub Pages. */
  if (e && e.parameter && String(e.parameter.bridge || '') === '1') {
    return HtmlService
      .createHtmlOutputFromFile('Bridge')
      .setTitle('MAGASIN API Bridge')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1, viewport-fit=cover'
    )
    .setTitle('MAGASIN | Hệ thống nội bộ');
}

/**
 * Nạp HTML partial.
 *
 * FIX: chuẩn hóa partial trước khi trả về.
 *
 * Index.html hiện bọc các partial JS bằng <script>...</script>
 * và partial CSS bằng <style>...</style>. Các phiên bản cũ của
 * _auth/_schedule/_attendance/_management có thể vẫn còn wrapper
 * <script>, còn _styles có thể còn wrapper <style>. Nếu include()
 * trả nguyên wrapper cũ sẽ tạo nested <script>/<style> và phần code
 * phía sau bị trình duyệt hiển thị thành TEXT.
 *
 * Hàm này loại wrapper cũ để mọi phiên bản partial đều tương thích.
 */
function include(filename) {
  const name = String(filename || '').trim();

  const allowed = [
    '_styles',
    '_auth',
    '_schedule',
    '_attendance',
    '_management'
  ];

  if (allowed.indexOf(name) === -1) {
    throw new Error(
      'Partial HTML không hợp lệ: "' + name + '". ' +
      'Chỉ được phép: ' + allowed.join(', ')
    );
  }

  try {
    /*
     * ARCH-01 / FIX-V7:
     * Các partial frontend của MAGASIN là RAW source:
     * - _styles     = CSS thuần
     * - _auth       = JavaScript thuần
     * - _schedule   = JavaScript thuần
     * - _attendance = JavaScript thuần
     * - _management = JavaScript thuần
     *
     * Index.html tự bọc partial bằng <style> hoặc <script>.
     * Vì vậy không dùng createHtmlOutputFromFile().getContent()
     * để parse partial như một tài liệu HTML trung gian.
     * Cách đó có thể làm hỏng source JS có các chuỗi HTML như
     * '<div>...</div>' và gây lỗi "Nội dung HTML không đúng định dạng".
     *
     * getRawContent() trả về nguyên văn source của file partial.
     */
    return HtmlService
      .createTemplateFromFile(name)
      .getRawContent();

  } catch (err) {
    throw new Error(
      'Không thể nạp partial HTML "' + name + '.html". ' +
      'Hãy kiểm tra file tồn tại với đúng tên "' + name + '.html". ' +
      'Chi tiết: ' + String(err && err.message || err)
    );
  }
}
