# MAGASIN — DATABASE SCHEMA V1

**Nguồn:** phân tích source canonical trên `main`.

**Mục đích:** chuẩn hóa database đích cho migration từ Google Sheets/Apps Script sang Supabase PostgreSQL. Đây là **schema thiết kế**, chưa phải dữ liệu thật và chưa yêu cầu xóa/chuyển dữ liệu hiện tại.

## 1. Nguyên tắc

- `auth.users` của Supabase là nguồn xác thực ở kiến trúc mới.
- `public.profiles` thay cho phần thông tin nghiệp vụ của tab **Người dùng**.
- Không migrate các cột `Mã băm mật khẩu`, `Muối mật khẩu`, `Muối xác thực`, `Mã xác thực`, `Hết hạn mã`, `Số lần thử` sang bảng public. Password hiện tại dùng cơ chế hash tùy biến trong Apps Script nên **không thể chuyển thẳng sang Supabase Auth** bằng schema alone; migration Login sẽ cần quy trình đặt lại mật khẩu.
- `access_scope` được giữ vì backend hiện tại dùng nó để giới hạn cửa hàng.
- `stores` là danh mục cửa hàng chuẩn; các bảng nghiệp vụ tham chiếu `stores.id` thay vì lưu mã cửa hàng tự do.
- Các trạng thái được lưu dạng `text` + `CHECK` để dễ tương thích với dữ liệu hiện tại.
- Các trường thời gian dùng `date`/`time`/`timestamptz` thay vì chuỗi khi dữ liệu có bản chất thời gian.
- RLS là lớp bảo vệ dữ liệu bắt buộc; frontend dùng publishable key, không dùng service-role key.

## 2. Mapping từ Google Sheets hiện tại

| Sheet hiện tại | Bảng đích | Trạng thái |
|---|---|---|
| Người dùng | `profiles` + `auth.users` | Thiết kế |
| Cửa hàng | `stores` | Thiết kế |
| Lịch làm việc | `work_schedules` | Thiết kế |
| Chấm công | `attendance` | Thiết kế |
| Bậc nhân viên | `employee_grades` | Thiết kế |
| Đổi ca | `shift_swaps` | Thiết kế |
| KPI | `kpi_records` | Thiết kế |
| Kho hàng | Chưa tạo bảng nghiệp vụ | Source hiện tại chỉ có stub |

## 3. `profiles`

Nguồn hiện tại: các cột nghiệp vụ của tab **Người dùng**:

`Id`, `Tên đăng nhập`, `Họ tên`, `Email`, `Số điện thoại`, `Vai trò`, `Trạng thái`, `Phạm vi truy cập`.

Thiết kế:

- `id uuid` — khóa chính, liên kết `auth.users.id`.
- `username text unique` — tên đăng nhập MAGASIN.
- `full_name text`.
- `email text`.
- `phone text`.
- `role text` — `STAFF`, `STORE_MANAGER`, `INVENTORY_MANAGER`, `OWNER`.
- `status text` — `ACTIVE`, `PENDING`, `INACTIVE`.
- `access_scope text` — giữ format hiện tại để dễ migration (`ALL`, `CNO1;CNO2`, ...).
- `created_at`, `updated_at`.

## 4. `stores`

Nguồn hiện tại: tab **Cửa hàng**:

`Id`, `Mã cửa hàng`, `Tên cửa hàng`, `Trạng thái`, `Ngày cập nhật`, `Ghi chú`.

Thiết kế:

- `id uuid`.
- `code text unique`.
- `name text`.
- `status text` — `ACTIVE` / `INACTIVE`.
- `notes text`.
- `created_at`, `updated_at`.

## 5. `employee_grades`

Nguồn hiện tại: tab **Bậc nhân viên**:

`Id`, `Người dùng`, `Họ tên`, `Bậc NV`, `Đơn giá giờ`, `Trạng thái`, `Ngày cập nhật`.

Thiết kế:

- `id uuid`.
- `user_id uuid` → `profiles.id`.
- `grade text`.
- `hourly_rate numeric(12,2)`.
- `status text` — `ACTIVE` / `INACTIVE`.
- `updated_at`.

`full_name` không lưu lặp lại; lấy từ `profiles.full_name`.

## 6. `work_schedules`

Nguồn hiện tại: tab **Lịch làm việc**:

`Id`, `Ngày`, `Ca`, `Giờ bắt đầu`, `Giờ kết thúc`, `Cửa hàng`, `Người dùng`, `Trạng thái`, `Người duyệt`, `Ngày duyệt`, `Ghi chú`.

Thiết kế:

- `id uuid`.
- `work_date date`.
- `start_time time`.
- `end_time time`.
- `store_id uuid`.
- `user_id uuid`.
- `status text` — `PENDING`, `APPROVED`, `CANCELLED`.
- `approver_id uuid nullable`.
- `approved_at timestamptz nullable`.
- `note text`.
- `origin text` — `USER_REQUEST`, `MANAGER_ASSIGNED`.
- `created_at`, `updated_at`.

`Ca` hiện tại được source suy ra từ `Giờ bắt đầu` (`Sáng`, `Chiều`, `Tối`, `Khác`), nên không cần là nguồn dữ liệu độc lập.

## 7. `attendance`

Nguồn hiện tại: tab **Chấm công**:

`Id`, `Ngày`, `Người dùng`, `Cửa hàng`, `Check-in`, `Check-out`, `Trạng thái`, `Đi muộn phút`, `Về sớm phút`, `Ghi chú`, `Ngày tạo`, `Họ tên`, `Ca`, `Bậc NV`, `Đơn giá giờ`, `Giờ công`, `Thành tiền`, `Giờ ca bắt đầu`, `Giờ ca kết thúc`.

Thiết kế:

- `id uuid`.
- `work_date date`.
- `user_id uuid`.
- `store_id uuid`.
- `check_in timestamptz nullable`.
- `check_out timestamptz nullable`.
- `status text` — `OPEN`, `COMPLETED`, `DELETED`, `DELETED_BY_MANAGER`, và các trạng thái nghiệp vụ cần bổ sung sau audit.
- `late_minutes integer default 0`.
- `early_minutes integer default 0`.
- `note text`.
- `created_at timestamptz`.
- `grade text` — snapshot tại thời điểm chấm công nếu cần đối soát lịch sử.
- `hourly_rate numeric(12,2)` — snapshot đơn giá.
- `hours_worked numeric(8,2)`.
- `amount numeric(14,2)`.
- `planned_start time nullable`.
- `planned_end time nullable`.

`full_name`, `Ca` có thể suy ra từ profile/schedule và không cần lưu trùng.

## 8. `shift_swaps`

Nguồn hiện tại: tab **Đổi ca**:

`Id`, `Ngày gửi`, `Người gửi`, `Ca hiện tại`, `Ca đề nghị`, `Cửa hàng`, `Lý do`, `Trạng thái`, `Người duyệt`, `Ngày duyệt`, `Ghi chú`.

Thiết kế:

- `id uuid`.
- `requested_at timestamptz`.
- `requester_id uuid`.
- `current_shift text` — giữ tương thích source hiện tại.
- `requested_shift text`.
- `store_id uuid`.
- `reason text`.
- `status text` — `PENDING`, `APPROVED`, `CANCELLED`, `REJECTED`.
- `approver_id uuid nullable`.
- `approved_at timestamptz nullable`.
- `note text`.

## 9. `kpi_records`

Nguồn hiện tại: tab **KPI**:

`Id`, `Kỳ`, `Người dùng`, `Cửa hàng`, `Chỉ tiêu`, `Kết quả`, `Trọng số`, `Điểm`, `Người đánh giá`, `Ngày cập nhật`, `Ghi chú`.

Thiết kế:

- `id uuid`.
- `period text` — giữ nguyên vì source hiện tại không quy định format kỳ KPI.
- `user_id uuid`.
- `store_id uuid`.
- `target text`.
- `result text`.
- `weight numeric(8,2)`.
- `score numeric(8,2)`.
- `evaluator_id uuid nullable`.
- `updated_at timestamptz`.
- `note text`.

## 10. Kho hàng

Module `13_Kho_hàng.gs` hiện chỉ trả trạng thái `implemented: false` và chưa có schema nghiệp vụ thực tế. Vì vậy **không tạo bảng kho giả định trong V1**.

## 11. Quan hệ chính

```text
auth.users
   │
   └── profiles
        ├── employee_grades
        ├── work_schedules ─── stores
        ├── attendance ─────── stores
        ├── shift_swaps ────── stores
        └── kpi_records ────── stores
```

`profiles.id` đồng nhất với `auth.users.id`.

## 12. RLS định hướng

- STAFF: đọc profile của chính mình; đọc lịch/chấm công/KPI/đổi ca của chính mình; tạo đăng ký ca/đổi ca/chấm công theo nghiệp vụ.
- STORE_MANAGER: thêm quyền đọc/quản lý dữ liệu trong `access_scope`.
- INVENTORY_MANAGER: quyền module kho sau khi schema kho được thiết kế.
- OWNER: toàn quyền nghiệp vụ.
- Không dùng `access_scope` làm cơ chế bảo mật duy nhất ở frontend; policy phải kiểm tra role và store ở database.

## 13. Những điểm chưa được source hỗ trợ

Source hiện tại chưa có đầy đủ nghiệp vụ:

- schema kho hàng thực tế;
- schema đơn hàng/POS;
- công thức KPI tổng hợp;
- bảng lịch sử thay đổi quyền;
- audit log toàn hệ thống.

Các phần này **không được tự thêm vào migration V1**.

## 14. Migration strategy

1. Tạo schema + RLS, chưa nhập dữ liệu.
2. Seed danh mục cửa hàng sau khi đối chiếu Sheet hiện tại.
3. Tạo profile mapping với tài khoản nhân viên.
4. Chuyển Login sang Supabase Auth; người dùng hiện tại cần hoàn tất reset mật khẩu.
5. Migrate lịch làm việc.
6. Migrate chấm công.
7. Migrate đổi ca/KPI.
8. Chỉ chuyển hệ thống production sau khi chạy song song và đối soát.
