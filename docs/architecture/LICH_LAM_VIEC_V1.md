# MAGASIN — KIẾN TRÚC LỊCH LÀM VIỆC V1

> Tài liệu kiến trúc. Chưa thay đổi production database hoặc thay thế luồng Google Apps Script hiện tại.

## 1. Mục tiêu UX

### Nhân viên
- Màn hình Lịch làm việc luôn hiển thị tuần hiện tại, chu kỳ Thứ Hai → Chủ Nhật.
- Mỗi ngày là một ô lịch riêng.
- Trong ô ngày, ca hiển thị dưới dạng thẻ có giờ và cửa hàng.
- Ca chuẩn hiện tại:
  - Sáng: 06:00–12:00
  - Chiều: 12:00–17:00
  - Tối: 17:00–22:00
- Mỗi nhóm ca có màu nhận diện cố định để giảm nhầm lẫn.
- Bên dưới lịch hiện tại là một hàng “Đăng ký lịch làm tuần tới” có mũi tên mở/đóng.
- Mặc định phần đăng ký thu gọn để không chiếm màn hình.
- Khi mở, hiển thị riêng lịch của tuần kế tiếp, Thứ Hai → Chủ Nhật.
- Mỗi ngày của tuần kế tiếp có các lựa chọn ca chuẩn và cửa hàng được phép đăng ký.
- Người dùng chọn ca/cửa hàng rồi gửi đăng ký. Yêu cầu có trạng thái Chờ duyệt / Đã duyệt / Từ chối / Đã hủy.
- Phía dưới phần đăng ký hiển thị trạng thái từng đăng ký để nhân viên biết yêu cầu nào đã được gửi và kết quả.

### Quản lý cửa hàng
- Một màn hình tổng quan theo tuần, không chỉ xem lịch của một cá nhân.
- Nếu quản lý có nhiều cửa hàng trong `access_scope`, hiển thị bộ lọc cửa hàng và cho phép xem từng cửa hàng.
- Có thể xem nhiều cửa hàng bằng các tab/bộ lọc, nhưng mỗi bảng luôn chỉ thuộc một cửa hàng để tránh nhầm nhân sự giữa các chi nhánh.
- Mỗi ngày hiển thị ba nhóm ca chuẩn: Sáng / Chiều / Tối.
- Trong từng ca hiển thị danh sách nhân viên, trạng thái và nguồn đăng ký.
- Yêu cầu đăng ký của nhân viên phải xuất hiện trong cùng cấu trúc lịch dưới dạng Chờ duyệt; không cần chuyển sang một màn hình dữ liệu khác.
- Quản lý có thể duyệt, từ chối, hủy hoặc xếp lịch trực tiếp theo quyền được cấp.
- OWNER có thể xem toàn bộ cửa hàng.

## 2. Chu kỳ tuần

```text
Tuần hiện tại: Thứ Hai → Chủ Nhật
                 ↓
        chỉ để theo dõi lịch chính thức

Tuần kế tiếp: Thứ Hai → Chủ Nhật
                 ↓
          vùng đăng ký của nhân viên
```

Quy tắc:
- Tất cả ngày trong UI đều quy về tuần bắt đầu Thứ Hai.
- Tuần kế tiếp = tuần hiện tại + 7 ngày.
- Nhân viên chỉ được tạo đăng ký cho 7 ngày của tuần kế tiếp.
- Tuần hiện tại không cho nhân viên sửa lịch chính thức từ màn hình đăng ký.
- Không dùng giờ trình duyệt để quyết định dữ liệu server; backend/database là nguồn sự thật cho ngày và trạng thái.

## 3. Mô hình dữ liệu hiện có và cách sử dụng

Repository hiện đã có `public.work_schedules` với các cột phù hợp:

- `id`
- `work_date`
- `start_time`
- `end_time`
- `store_id`
- `user_id`
- `status`: `PENDING | APPROVED | CANCELLED`
- `approver_id`
- `approved_at`
- `note`
- `origin`: `USER_REQUEST | MANAGER_ASSIGNED`
- `created_at`, `updated_at`

Kiến trúc V1 tận dụng bảng này, chưa tạo thêm bảng lịch mới.

### Ý nghĩa nghiệp vụ

```text
USER_REQUEST + PENDING
= nhân viên đăng ký, chờ quản lý duyệt

USER_REQUEST + APPROVED
= đăng ký của nhân viên đã trở thành lịch chính thức

MANAGER_ASSIGNED + APPROVED
= quản lý trực tiếp xếp lịch

CANCELLED
= yêu cầu/ca đã hủy, không xuất hiện trong lịch chính thức
```

## 4. Chuẩn hóa ca

V1 dùng ba ca chuẩn làm bộ nhận diện UI:

| Mã | Tên | Giờ | Màu UI | Ý nghĩa |
|---|---|---|---|---|
| MORNING | Sáng | 06:00–12:00 | màu nhóm 1 | Ca sáng |
| AFTERNOON | Chiều | 12:00–17:00 | màu nhóm 2 | Ca chiều |
| EVENING | Tối | 17:00–22:00 | màu nhóm 3 | Ca tối |

Màu chỉ là tín hiệu thị giác; giờ bắt đầu/kết thúc vẫn luôn phải hiển thị bằng text để tránh phụ thuộc màu.

Backend hiện đã có logic phân loại ca theo giờ. Về lâu dài nên chuyển việc chuẩn hóa này thành cấu hình dùng chung thay vì để frontend tự suy đoán.

## 5. API nghiệp vụ V1

### Nhân viên

```text
getMySchedule(week_start)
→ lịch chính thức của tôi trong tuần hiện tại

getMyNextWeekRegistration(week_start)
→ toàn bộ đăng ký của tôi trong tuần kế tiếp

getScheduleStoreOptions()
→ cửa hàng mà người dùng được phép đăng ký

registerShift(work_date, start_time, end_time, store_id)
→ tạo USER_REQUEST + PENDING

cancelShift(schedule_id)
→ hủy yêu cầu chưa được duyệt
```

### Quản lý

```text
getManagerStores()
→ các cửa hàng nằm trong quyền truy cập

getStoreWeekSchedule(store_id, week_start)
→ lịch tổng quan của một cửa hàng

getPendingScheduleRequests(store_id, week_start)
→ các đăng ký đang chờ duyệt

approveSchedule(schedule_id)
rejectSchedule(schedule_id, note)
managerAssignSchedule(user_id, store_id, work_date, start_time, end_time)
```

Các tên hàm trên là contract kiến trúc; khi chuyển backend hoàn toàn sang Supabase có thể cài bằng RPC hoặc REST/Data API tương ứng.

## 6. Quy tắc phân quyền

### STAFF
- Đọc lịch của chính mình.
- Tạo đăng ký cho chính mình ở cửa hàng nằm trong phạm vi được cấp.
- Hủy đăng ký của chính mình nếu còn `PENDING`.
- Không thấy lịch chi tiết của nhân viên khác.
- Không duyệt lịch.

### STORE_MANAGER
- Đọc lịch nhân sự của các cửa hàng thuộc `access_scope`.
- Xem đăng ký `PENDING` của các cửa hàng được phép quản lý.
- Duyệt/từ chối/xếp lịch trong phạm vi đó.
- Không đọc dữ liệu cửa hàng ngoài phạm vi.

### OWNER
- Toàn quyền xem/duyệt/xếp lịch tất cả cửa hàng.

RLS là lớp bảo vệ cuối cùng; UI chỉ là lớp trình bày và không được coi là cơ chế bảo mật.

## 7. Giao diện nhân viên

```text
┌──────────────────────────────────────────────┐
│ LỊCH LÀM VIỆC                                │
│ Tuần 25/08 – 31/08                           │
├─────────┬─────────┬─────────┬─────────┬──────┤
│ T2      │ T3      │ T4      │ ...     │ CN   │
│ 25/08   │ 26/08   │ 27/08   │         │31/08 │
│         │         │         │         │      │
│ 🟦 06–12│         │ 🟩 12–17│         │🟧17–22│
│ CN01    │         │ CN02    │         │ CN01 │
└─────────┴─────────┴─────────┴─────────┴──────┘

┌──────────────────────────────────────────────┐
│ ĐĂNG KÝ LỊCH LÀM TUẦN TỚI              ˅   │
└──────────────────────────────────────────────┘

Khi mở:

┌──────────────────────────────────────────────┐
│ Tuần đăng ký 01/09 – 07/09                   │
│                                              │
│ T2  [06–12] [12–17] [17–22]                 │
│     Cửa hàng: CN01 ▼                         │
│                                              │
│ T3  [06–12] [12–17] [17–22]                 │
│     Cửa hàng: CN01 ▼                         │
│                                              │
│ ...                                          │
│                                              │
│             [ Gửi đăng ký ]                  │
└──────────────────────────────────────────────┘

Đăng ký đã gửi:
T2 · 06:00–12:00 · CN01 · Chờ duyệt
T4 · 17:00–22:00 · CN02 · Đã duyệt
```

Trên mobile không ép 7 cột quá nhỏ; ưu tiên cuộn ngang cho bảng tuần hoặc chuyển từng ngày thành card dọc. Desktop có thể dùng 7 cột.

## 8. Giao diện quản lý

```text
┌────────────────────────────────────────────────────────────┐
│ LỊCH CỬA HÀNG                                               │
│ [CN01 ▼] [Tuần hiện tại] [←] [→]                          │
├────────┬───────────────────────────────────────────────────┤
│        │ 06:00–12:00 │ 12:00–17:00 │ 17:00–22:00           │
├────────┼─────────────┼─────────────┼───────────────────────┤
│ T2     │ An           │ Bình        │ Cường                │
│        │ Dung         │ [PENDING]  │                      │
├────────┼─────────────┼─────────────┼───────────────────────┤
│ T3     │ ...          │ ...         │ ...                  │
└────────┴─────────────┴─────────────┴───────────────────────┘

PENDING phải hiển thị nổi bật nhưng vẫn nằm trong đúng ô ca.

Thao tác trên ô:
[ Xem ] [ Duyệt ] [ Từ chối ]

Có thể chuyển sang dạng card theo từng ngày trên mobile.
```

## 9. Quy tắc tránh trùng/nhầm lịch

- Một yêu cầu phải có `user_id + store_id + work_date + start_time + end_time`.
- Không cho tạo bản ghi trùng hoàn toàn khi bản ghi trước chưa `CANCELLED`.
- Không cho một nhân viên được đăng ký hai ca chồng thời gian trong cùng một ngày nếu nghiệp vụ không cho phép.
- Khi quản lý xếp lịch, phải kiểm tra xung đột ca trước khi `APPROVED`.
- Cùng một nhân viên có thể có nhiều ca trong ngày chỉ khi các ca không chồng thời gian.
- Tên cửa hàng phải đi cùng từng ca trong UI, không chỉ đặt ở tiêu đề trang.

## 10. Trạng thái và màu

```text
PENDING   → vàng/cam nhạt + nhãn “Chờ duyệt”
APPROVED  → màu nhóm ca + nhãn “Đã duyệt”
CANCELLED → xám + nhãn “Đã hủy” (chỉ hiện trong lịch sử)
REJECTED  → đỏ nhạt + lý do (lưu lịch sử yêu cầu)
```

Lưu ý: schema `work_schedules` V1 hiện chưa có `REJECTED`. Nếu cần workflow từ chối chính thức, migration sau này nên mở rộng constraint hoặc tách lịch chính thức và request thành hai thực thể. Không tự ý đổi production trong giai đoạn kiến trúc.

## 11. Đồng bộ với chấm công

`attendance` phải lấy ca đã `APPROVED` làm lịch dự kiến (`planned_start`, `planned_end`).

```text
work_schedules APPROVED
          ↓
attendance planned_start / planned_end
          ↓
check-in / check-out
          ↓
late_minutes / early_minutes / amount
```

Không dùng `PENDING` làm lịch chấm công chính thức.

## 12. Roadmap triển khai

### Phase 1 — UI contract
- Chuẩn hóa 7 ngày tuần hiện tại.
- Xây card ca màu + cửa hàng.
- Hàng accordion đăng ký tuần tới.
- Form chọn ca chuẩn và cửa hàng.
- Hiển thị trạng thái từng đăng ký.

### Phase 2 — Supabase read/write
- Đọc `work_schedules` bằng Supabase/RLS.
- Tạo request PENDING.
- Hủy request PENDING.
- Quản lý xem lịch theo store.

### Phase 3 — Approval
- Duyệt/từ chối.
- Manager assigned.
- Kiểm tra xung đột ca.
- Audit người duyệt/thời gian duyệt.

### Phase 4 — Attendance integration
- Đồng bộ ca APPROVED → planned_start/planned_end.
- Chặn chấm công theo lịch chưa hợp lệ.

### Phase 5 — Production hardening
- RLS test matrix theo STAFF / STORE_MANAGER / OWNER.
- Test timezone Asia/Ho_Chi_Minh.
- Test tuần giao tháng/năm.
- Test multi-store manager.
- Test mobile.

## 13. Quyết định kiến trúc

V1 ưu tiên **một nguồn dữ liệu lịch duy nhất là `work_schedules`**, tránh tạo thêm bảng chỉ để lặp lại lịch. Phần “đăng ký” được biểu diễn bởi `status=PENDING` và `origin=USER_REQUEST`; phần “lịch chính thức” là `APPROVED` hoặc `MANAGER_ASSIGNED`.

Khi nghiệp vụ phức tạp hơn (từ chối, lịch mẫu, ca chuẩn theo từng cửa hàng, khóa tuần, lịch sử thay đổi), có thể tách thành `shift_templates`, `schedule_requests`, `work_schedules` và `schedule_audit_logs` trong một migration V2.
