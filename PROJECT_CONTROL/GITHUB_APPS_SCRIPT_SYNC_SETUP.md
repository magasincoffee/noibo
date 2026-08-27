# MAGASIN — GITHUB → APPS SCRIPT SYNC

## Mục tiêu
GitHub `main` là source of truth cho `backend/` và `frontend/`. Apps Script là runtime. File `backend/20_Đồng_bộ_GitHub.gs` cho phép đọc canonical source từ GitHub và cập nhật Apps Script HEAD theo cơ chế có backup.

## An toàn
- Sync tạo một Apps Script version backup trước khi `updateContent`.
- Sync không tự deploy production.
- Sync không xóa các file Apps Script ngoài danh sách canonical.
- Không lưu mật khẩu, API key hoặc token GitHub.
- Chỉ chạy sync sau khi `previewDongBoGitHub()` pass.

## Cần làm một lần trong Apps Script

### 1. Thêm `20_Đồng_bộ_GitHub.gs`
Copy toàn bộ file từ `backend/20_Đồng_bộ_GitHub.gs` vào project Apps Script.

### 2. Bật Apps Script API
Trong Google Cloud project liên kết với Apps Script, bật **Apps Script API**.

### 3. Bổ sung OAuth scope
Trong `appsscript.json`, giữ nguyên các scope hiện có và bổ sung:

```json
"https://www.googleapis.com/auth/script.projects"
```

Nếu project đã có `oauthScopes`, chỉ thêm dòng trên vào mảng. Không thay thế toàn bộ manifest.

### 4. Cấp quyền
Save project rồi chạy:

`testDongBoGitHub`

Google sẽ yêu cầu cấp quyền lần đầu. Chấp nhận quyền để script có thể đọc project và gọi Apps Script API.

## Quy trình đồng bộ hàng ngày

### Bước A — kiểm tra GitHub
Chọn hàm:

`previewDongBoGitHub`

Kết quả phải có `ok: true` và danh sách canonical files.

### Bước B — đồng bộ
Chọn hàm:

`dongBoGitHubSangAppsScript`

Kết quả phải có:

- `ok: true`
- `backupVersionNumber`
- `synchronizedCount`
- `resultingFileCount`

### Bước C — kiểm thử runtime
Mở WebApp và kiểm tra Login, reload, logout, lịch làm và các nghiệp vụ liên quan.

### Bước D — deploy production
Chỉ khi kiểm thử pass mới tạo **New version** trong Deploy.

## Lưu ý kỹ thuật
Apps Script API `projects.updateContent` cập nhật HEAD content của toàn project và làm mất các file không nằm trong payload. Vì vậy module sync đọc project hiện tại, merge các file canonical từ GitHub và giữ lại các file khác trước khi update.

## Không tự động hóa deploy ở giai đoạn đầu
Giai đoạn hiện tại dùng mô hình:

`GitHub main → Sync thủ công 1 nút → Test → Deploy`

Sau khi hệ thống ổn định mới cân nhắc trigger/CI/CD tự động.
