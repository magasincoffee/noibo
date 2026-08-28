# MAGASIN — LỊCH NHÂN SỰ V2 — IMPLEMENTATION

## Mục tiêu
- Nhân viên đăng ký **khoảng thời gian có thể làm**, không bị khóa vào ca cố định.
- OWNER khai báo nhu cầu nhân sự theo cửa hàng/ngày/khoảng giờ/năng lực.
- Skill/training/can-work-alone được biểu diễn bằng dữ liệu.
- Scheduler V1 tạo **DRAFT**, không tự publish.
- Manager xem coverage, availability, lịch hiện tại và yêu cầu nhân sự trước khi quyết định.

## Backend Apps Script — canonical runtime
Đã thêm:
- `backend/21_Lịch_nhân_sự_V2.gs`
- `backend/22_Lịch_nhân_sự_V2_Board.gs`
- `backend/23_Lịch_nhân_sự_V2_Validation.gs`

Các Sheet lazy-created:
- `Lịch sẵn sàng`
- `Nhu cầu nhân sự`
- `Năng lực nhân viên`
- `Ràng buộc nhân viên`
- `Lịch xếp tự động`

Các API chính:
- availability: `getMyAvailability`, `saveMyAvailability`, `cancelMyAvailability`
- employee profile: `getEmployeeSchedulingProfile`, `saveEmployeeSkill`, `saveEmployeeConstraint`
- staffing demand: `getStaffingRequirements`, `saveStaffingRequirement`, `copyStaffingRequirements`
- scheduling: `generateScheduleDraft`, `getScheduleDraft`, `cancelScheduleDraft`
- board: `getScheduleV2StoreOptions`, `getScheduleV2Board`
- safety: `validateScheduleDraftHardRules`
- setup: `setupScheduleV2`

## Frontend
Đã thêm:
- `frontend/_schedule_v2.html`
- `frontend/_schedule_v2_boot.js`
- `frontend/_schedule_v2_control.js`

`backend/18_GitHub_Frontend_Loader.gs` đã được cập nhật để tải và kích hoạt lớp V2 sau các partial ổn định.

UX V2:
- Lịch chính thức tuần hiện tại.
- Accordion đăng ký tuần kế tiếp.
- Preset `Cả ngày 06:00–14:00`, sáng, chiều, tối nhưng vẫn cho tùy chỉnh từng 30 phút.
- Chọn cửa hàng theo quyền truy cập.
- Manager board theo cửa hàng/tuần.
- OWNER có màn hình `Nhu cầu nhân sự`.
- Nút `Tạo lịch tự động` tạo draft và chạy hard-rule validation trước khi coi là hợp lệ.

## Hard rules hiện tại
- Không ngoài availability.
- Không vượt max giờ/ngày hoặc giờ/tuần nếu được cấu hình.
- Không xếp nhân viên ngoài access scope.
- Không để nhân viên training/không thể đứng ca một mình ở slot nếu không có người có thể mentor/đứng độc lập cùng slot.
- Draft không được tự publish.

## Supabase — prepared migration
Đã thêm:
- `supabase/migrations/20260828001100_schedule_workforce_v2.sql`

Migration mô hình hóa tương ứng cho runtime Supabase tương lai. **Chưa yêu cầu chạy production trong tác vụ này.**

## Chưa hoàn tất trong V2.0
- Solver tối ưu toàn cục (hiện là greedy/rule-based V1).
- Tối ưu cost/fairness đa mục tiêu nâng cao.
- Nút publish draft vào `Lịch làm việc` theo batch transaction.
- Notifications/email cho lịch được publish.
- Demand forecasting/AI recommendation.

## Nguyên tắc triển khai
Không retire Apps Script hiện tại cho tới khi full smoke test của auth, schedule, attendance, swap và production runtime đạt PASS.
