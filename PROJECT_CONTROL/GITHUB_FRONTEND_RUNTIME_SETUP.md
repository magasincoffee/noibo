# MAGASIN — GitHub Frontend Runtime Setup

## Mục tiêu
Google Apps Script vẫn là runtime/backend. GitHub `main` là source of truth của frontend. Apps Script tải frontend canonical từ GitHub rồi render bằng HtmlService.

## Canonical frontend
- `frontend/Index.html`
- `frontend/_styles.html`
- `frontend/_auth.html`
- `frontend/_schedule.html`
- `frontend/_attendance.html`
- `frontend/_management.html`

## Apps Script cần có
- `15_Ứng_dụng_web.gs` bản ARCH-05: hỗ trợ `?source=github`.
- `18_GitHub_Frontend_Loader.gs`: tải các file canonical từ GitHub.

## Luồng runtime
GitHub main → UrlFetchApp → ghép Index + partials → HtmlService → `google.script.run` → backend → Google Sheets.

## Triển khai an toàn
1. Thêm `18_GitHub_Frontend_Loader.gs` vào Apps Script.
2. Cập nhật `15_Ứng_dụng_web.gs` theo bản canonical trên GitHub.
3. Save project.
4. Chạy hàm `testGithubFrontendLoader_()` một lần để cấp quyền `UrlFetchApp` và kiểm tra tải source.
5. Deploy Web App thành version mới.
6. Mở URL Web App với `?source=github` để kiểm tra runtime GitHub.
7. Chỉ sau khi kiểm tra pass mới đổi mặc định `doGet()` sang `renderGithubFrontend_()`.

## Không cần
- Không cần iframe Bridge cho runtime chính.
- Không cần copy frontend thủ công mỗi lần sửa.
- Không đưa mật khẩu, token, secret hoặc dữ liệu cá nhân production vào GitHub.
