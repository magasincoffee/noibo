# MAGASIN — CLEAN SYNC MIGRATION

## Mục tiêu
Đưa Apps Script về trạng thái sạch: GitHub `main` là source-of-truth; Apps Script HEAD được tái tạo chính xác từ manifest + 27 file canonical.

## Trạng thái canonical
- Sync engine: `backend/20_Đồng_bộ_GitHub.gs`
- Manifest: `PROJECT_CONTROL/appsscript.json`
- Canonical backend: `backend/01_Cấu_hình_hệ_thống.gs` → `backend/20_Đồng_bộ_GitHub.gs`
- Canonical frontend: `frontend/Index.html`, `_styles.html`, `_auth.html`, `_schedule.html`, `_attendance.html`, `_management.html`, `_phase2_ui_fix.html`

## Quy trình một lần
1. Trong Apps Script, giữ lại `20_Đồng_bộ_GitHub.gs` và `appsscript.json`.
2. Có thể xóa/clear các file Apps Script cũ khác trước khi sync; không xóa `20_Đồng_bộ_GitHub.gs` và không xóa manifest.
3. Thay nội dung `20_Đồng_bộ_GitHub.gs` bằng bản V2 trên GitHub `main`.
4. Save và chạy `testDongBoGitHub()`.
5. Chạy `previewDongBoGitHub()`.
6. Chạy `previewDongBoGitHubSyncPlan()` để thấy các file sẽ thêm/thay/xóa.
7. Chỉ khi preview đúng mới chạy `dongBoGitHubSangAppsScript()`.
8. Sync sẽ tạo Version backup trước khi ghi và sau đó thay toàn bộ Apps Script HEAD bằng target canonical.
9. Không tự deploy. Sau sync phải smoke-test rồi mới tạo deployment production.

## Điều cần hiểu
`projects.updateContent` là exact replacement. Các file Apps Script không có trong target sẽ bị loại khỏi HEAD. Đây là chủ ý của CLEAN SYNC để loại legacy duplicates và tránh lỗi global redeclaration.

## Kỳ vọng sau CLEAN SYNC
Apps Script sẽ có manifest `appsscript` và 27 file runtime canonical. Tên file trong Apps Script không có `.gs`/`.html` vì đây là quy ước của Apps Script API.
