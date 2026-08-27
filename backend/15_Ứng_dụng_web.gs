/* =========================================================
   MAGASIN — ỨNG DỤNG WEB
   ARCH-05 / GitHub Frontend Runtime
========================================================= */

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};

  /*
   * GitHub Pages Bridge phải được phục vụ trước mọi khởi tạo Sheet.
   * Nếu ensureOperationalSheets_() chạy trước, một Web App anonymous/
   * iframe request có thể fail trước khi Bridge kịp gửi READY message.
   */
  if (String(params.bridge || '') === '1') {
    return HtmlService
      .createHtmlOutputFromFile('Bridge')
      .setTitle('MAGASIN API Bridge')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  ensureOperationalSheets_();

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
    '_management',
    '_phase2_ui_fix'
  ];

  if (allowed.indexOf(name) === -1) {
    throw new Error(
      'Partial HTML không hợp lệ: "' + name + '". ' +
      'Chỉ được phép: ' + allowed.join(', ')
    );
  }

  try {
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
