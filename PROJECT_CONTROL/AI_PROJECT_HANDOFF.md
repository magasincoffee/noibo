# MAGASIN NOIBO — AI PROJECT HANDOFF

Tài liệu này là checkpoint tiếp nhận ngữ cảnh cho các phiên ChatGPT/Codex tiếp theo. Khi mở chat mới về MAGASIN NOIBO, đọc `README.md`, `PROJECT_CONTROL/STATUS.md` và file này trước khi sửa code, database hoặc workflow.

## Protocol chat mới

Khi người dùng yêu cầu “đọc lại tài liệu dự án và báo cáo công việc lần trước”, trợ lý phải:
1. Đọc README.
2. Đọc STATUS.
3. Đọc AI PROJECT HANDOFF.
4. Kiểm tra PR/checkpoint đang mở.
5. Đọc architecture/business-rules liên quan.
6. Báo cáo: đã hoàn thành, đang làm, chưa chốt, blocker, bước tiếp theo.
7. Ưu tiên checkpoint GitHub mới hơn trí nhớ của chat cũ.

## Workflow chính thức

```text
Nhu cầu người dùng
→ Phân tích nghiệp vụ
→ HTML Prototype
→ Review / bấm thử
→ CHỐT structure + workflow
→ Backend (DB / migration / RLS / RPC / validation)
→ Frontend thật
→ Figma UX/UI refinement
→ Browser test
→ CI → PR → approval → main
→ Production
```

**Không xây backend cho workflow chưa được người dùng CHỐT.** HTML Prototype là sandbox cho bố cục/cấu trúc/workflow trước backend. Figma được giữ cho refinement UX/UI sau khi cấu trúc đúng và frontend thật đã có nền tảng.

Từ khóa **CHỐT** phải được ghi thành decision/checkpoint trong GitHub.

## Technical architecture

```text
Browser / GitHub Pages
→ Supabase Auth
→ Supabase PostgreSQL + RLS + RPC / Edge Functions
→ Runtime business data
→ Print Agent (khi cần) → LAN → HPRT TL31E
```

Google Apps Script, Google Sheets, `google.script.run`, iframe bridge và GitHub→Apps Script synchronizer không được tái đưa vào chức năng mới.

## Trạng thái dự án

Theo `PROJECT_CONTROL/STATUS.md`, Workforce V2 Phase 0–10 đã hoàn thành các checkpoint kỹ thuật; Phase 10 Shift Swap đã được browser/E2E verification và merge vào `main`. `main` được bảo vệ bằng PR, approval và required CI checks.

Hiện đang thiết kế/hoàn thiện ba giao diện production theo thứ tự:

```text
EMPLOYEE → MANAGER → OWNER
```

Hiện tại chỉ tập trung **EMPLOYEE** cho đến khi người dùng nói `CHỐT EMPLOYEE`.

## Employee UX đã thống nhất trong giai đoạn thiết kế

### App shell

- Header toàn màn hình.
- `☰` mở sidebar drawer từ trái sang phải.
- Header chỉ hiển thị **mục đang chọn**, không hiển thị toàn bộ menu.
- Bên phải có chuông.
- Kế bên chuông hiển thị tên đăng nhập (ví dụ `Trắng`) và cấp bậc/vai trò (ví dụ `Cấp 2 · Nhân viên`).
- Ô avatar là vùng cập nhật ảnh đại diện.
- Sidebar là overlay; khi đóng, content phải chiếm toàn bộ chiều rộng.

### Employee navigation

- Tổng quan
- Lịch làm
- Chấm công
- Tồn hàng
- Đổi ca
- Thông báo
- Thông tin cá nhân
- Academy

### Tổng quan

Không nhồi toàn bộ lịch tuần. Tập trung:

```text
Tổng quan
├── Hôm nay
├── Công việc hôm nay
├── Đăng ký lịch làm tuần tới
├── Academy
└── Năng lực & lộ trình
```

Nếu part-time không có ca: vẫn giữ ô Hôm nay và dùng empty state `Hôm nay không có ca`, kèm ca tiếp theo nếu có; không hiện nút chấm công/nhập tồn.

Nếu không có task: vẫn giữ ô Công việc hôm nay và dùng empty state. Task có thể là việc trong ca hoặc nhiệm vụ giao riêng.

### Đăng ký lịch tuần tới

- Mở đăng ký từ **Thứ Năm đến Thứ Bảy hằng tuần**.
- Chỉ được chọn ngày trong tuần kế tiếp.
- Form: ngày, giờ bắt đầu, giờ kết thúc, chi nhánh mong muốn.
- Nút `Đăng ký`; không dùng `Thêm ca`.
- Sau khi đăng ký hiển thị tổng quan Thứ Hai → Chủ Nhật.
- Có `Hoàn thành đăng ký lịch làm` / `Chốt đăng ký lịch làm`.
- Cần nhắc part-time nếu chưa chốt.

### Lịch chính thức

- Thứ Hai → Chủ Nhật.
- Ngày hiện tại được nổi bật.
- Ví dụ 29/08/2026 là Thứ Bảy → tuần 24/08 → 30/08.
- Mỗi ngày là một ô; ưu tiên Thứ + ngày.
- Ca hiển thị giờ làm + CN1/CN2/CN3/CN4.
- Khung giờ dùng hệ màu thống nhất.
- Không lặp chữ `Lịch chính thức` trong từng ca.

### Time rule toàn hệ thống

**24 giờ, bước 30 phút.** Không dùng `SA/CH` và không dùng bước 5/10/15 phút.

Decision: `docs/decisions/DECISION-UI-002-global-time-step-30-minutes.md`.

### Chấm công

Form: ngày, cửa hàng, giờ vào, giờ ra.

History: ngày làm, cửa hàng, giờ vào, giờ ra, số giờ công, thành tiền.

```text
thành tiền = số giờ công × đơn giá theo cấp bậc
```

Mức hiện tại:
- Cấp 1: 16.000đ/giờ
- Cấp 2: 17.000đ/giờ
- Cấp 3: 19.000đ/giờ
- Ca mở 05:00–08:00: 21.000đ/giờ

Chi tiết màn hình cấu hình Nhân sự/đơn giá sẽ chốt riêng.

### Tồn hàng

Employee chỉ nhập liệu; sau xác nhận được sửa tối đa **2 giờ**.

Manager được chỉnh sửa trong **12 giờ kể từ lúc Employee xác nhận**.

```text
Tồn hôm trước + Nhập hàng − Tồn hôm nay = Xuất hàng
```

Hàng hóa phải quy đổi thành tiền.

Nhu cầu cửa hàng được cấu hình một lần theo cửa hàng; không phải cài lại theo ngày nếu nhu cầu không đổi.

### Manager scope

Một Manager được phân quyền 1 hoặc 2 cửa hàng tùy thời điểm/năng lực; **tối đa 2 cửa hàng**.

### Owner

Owner có thể phân quyền Manager, giao việc, xem doanh thu/chi phí/KPI và báo cáo tài chính dựa trên dữ liệu thực. Cơ chế khoán toàn bộ cho Manager là định hướng vận hành đã trao đổi.

### Đổi ca / Cho ca

Employee chọn trước:

```text
[ Đổi ca ]   [ Cho ca ]
```

Sau đó chỉ hiện form tương ứng.

**Đổi ca:** ca của tôi + nhân viên trao đổi + ca đối ứng; có thể cùng ngày hoặc khác ngày.

**Cho ca:** ca của tôi + người nhận; không cần ca đối ứng.

Luồng:

```text
Employee gửi
→ người nhận nhận thông báo
→ quản lý nhận thông báo
→ duyệt / từ chối
→ duyệt thì cập nhật lịch chính thức
```

Lịch chính thức sau xử lý cần ghi ví dụ `Đã đổi ca với NV xxx` hoặc `Ca được nhận bởi NV xxx`.

Lịch sử đổi ca có lọc `Từ ngày → Đến ngày` và preset `Tuần này`, `Tháng này`, `Tuần trước`, `Tháng trước`, `Tất cả`.

### Academy

Academy dành cho kiến thức, nghiệp vụ, bài bắt buộc, bài đánh giá, tiến độ và năng lực theo cấp bậc.

```text
Nhân viên mới
→ Học + thực hành
→ Đánh giá
→ Theo dõi năng lực
→ Nhân viên thành thạo
→ Ứng viên quản lý
→ Đào tạo Manager
```

## Current prototype checkpoint

Prototype Employee đã trải qua nhiều vòng chỉnh sửa đến **v21** trong chat. Bản v21 là prototype UI mới nhất trong sandbox của phiên làm việc hiện tại; chưa phải source production trên `main`.

PR liên quan:
- **#18** `docs: establish prototype-first development workflow` — draft, chứa README workflow mở rộng.
- **#19** `docs: Employee UI v21 checkpoint` — draft, ghi các quyết định UX/UI Employee.

Khi tiếp tục phải kiểm tra hai PR này trước để tránh trùng lặp.

## Quy tắc GitHub

- `main` là source of truth của code/migration/tài liệu đã chốt.
- Supabase là source of truth của runtime data.
- Thay đổi chức năng đi qua branch → CI → PR → approval → merge.
- Required checks và approval phải đạt trước khi merge `main`.

## Khi người dùng nói “CHỐT”

```text
1. Ghi decision/checkpoint vào GitHub
2. Ghi version / phạm vi / ngày
3. Cập nhật STATUS nếu cần
4. Cập nhật CHANGELOG nếu cần
5. Không tự thay đổi quyết định ở bước triển khai
```

## Báo cáo tiếp nhận cho chat mới

```text
MAGASIN NOIBO — CONTINUATION REPORT

1. Canonical baseline:
2. Đã hoàn thành:
3. PR/checkpoint mới nhất:
4. Đang làm:
5. Business rules đã CHỐT:
6. UI/UX đã CHỐT:
7. Chưa được phép triển khai:
8. Blocker / risk:
9. Bước tiếp theo:
```
