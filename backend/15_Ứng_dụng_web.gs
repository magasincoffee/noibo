/* =========================================================
   MAGASIN — ỨNG DỤNG WEB
   ARCH-05 / GitHub Frontend Runtime
========================================================= */

function doGet(e) {
  ensureOperationalSheets_();

  const params = (e && e.parameter) ? e.parameter : {};

  /*
   * ARCH-03: Bridge cũ được giữ lại để tương thích tạm thời.
   * Runtime chính mới không còn phụ thuộc bridge này.
   */
  if (String(params.bridge || '') === '1') {
    return HtmlService
      .createHtmlOutputFromFile('Bridge')
      .setTitle('MAGASIN API Bridge')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  /*
   * ARCH-05:
   * Khi source=github, Apps Script tải frontend canonical từ GitHub main
   * và ghép các partial trước khi render.
   *
   * Không đổi mặc định ngay để WebApp production hiện tại tiếp tục chạy
   * ổn định trong giai đoạn chuyển đổi.
   */
  if (String(params.source || '').toLowerCase() === 'github') {
    return renderGithubFrontend_();
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
 * Nạp HTML partial từ Apps Script project hiện tại.
 * Giữ lại để WebApp production cũ hoạt động song song trong thời gian
 * chuyển frontend sang GitHub.
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
     * Các partial frontend là RAW source:
     * - _styles     = CSS thuần
     * - _auth       = JavaScript thuần
     * - _schedule   = JavaScript thuần
     * - _attendance = JavaScript thuần
     * - _management = JavaScript thuần
     *
     * Index.html tự bọc partial bằng <style>/<script>.
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
