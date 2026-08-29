# MAGASIN NOIBO

Hệ thống vận hành nội bộ MAGASIN COFFEE.

> **Nguyên tắc phát triển:** Thiết kế và xác nhận nhu cầu trước, triển khai backend sau. Không xây backend cho một workflow chưa được người dùng chốt.

## 1. Phạm vi dự án

MAGASIN NOIBO là webapp nội bộ phục vụ vận hành MAGASIN COFFEE. Hiện có 4 chi nhánh dùng chung nhân viên:

- MAGASIN COFFEE CN1
- MAGASIN COFFEE CN2
- MAGASIN COFFEE CN3
- MAGASIN COFFEE CN4

Định danh cửa hàng phải dựa trên **store ID ổn định**, không phụ thuộc địa chỉ vật lý vì cửa hàng có thể di dời hoặc thay đổi địa điểm.

## 2. Kiến trúc kỹ thuật chuẩn

- **Frontend:** GitHub Pages (`web/`)
- **Backend:** Supabase
- **Authentication:** Supabase Auth
- **Database:** Supabase PostgreSQL
- **Authorization:** PostgreSQL RLS + RPC
- **Email:** SMTP provider cấu hình trong Supabase Auth
- **Printer:** Print Agent cục bộ tại cửa hàng, kết nối Supabase queue → LAN → HPRT TL31E

**Google Apps Script, Google Sheets và `google.script.run` đã được loại khỏi kiến trúc dự án.** Không tạo thêm `.gs`, Apps Script Web App hoặc bridge cho tính năng mới.

## 3. Source of truth

- **GitHub `main`:** source of truth của mã nguồn, migration và tài liệu đã chốt.
- **Supabase:** source of truth của dữ liệu runtime.
- **HTML Prototype:** source để thử nghiệm bố cục/cấu trúc/workflow trước backend; prototype đã chốt được version hóa dưới `prototype/`.
- **Figma:** source of truth cho UX/UI sau khi giao diện thật đã được triển khai và bước refinement được phê duyệt.

## 4. Workflow phát triển chính thức

Đây là workflow mặc định cho mọi chức năng mới hoặc chức năng cần thiết kế lại.

```text
BẠN MÔ TẢ NHU CẦU
        ↓
PHÂN TÍCH NGHIỆP VỤ
- business rules
- user roles
- trạng thái
- quyền
- acceptance criteria
        ↓
HTML PROTOTYPE
- bố cục
- cấu trúc
- luồng thao tác
- trạng thái cơ bản
        ↓
BẠN REVIEW + BẤM THỬ
- thử nhanh trong chat khi cần tốc độ
- version hóa trên GitHub khi ổn định
        ↓
CHỐT CẤU TRÚC / WORKFLOW
        ↓
BACKEND IMPLEMENTATION
- database
- migrations
- RLS
- RPC / functions
- validation
        ↓
FRONTEND IMPLEMENTATION
- bám cấu trúc đã chốt
        ↓
FIGMA UX/UI REFINEMENT
- typography
- spacing
- color
- components
- interaction states
- responsive
- visual polish
        ↓
BROWSER TEST
        ↓
CI → PR → REVIEW → MAIN
        ↓
PRODUCTION
```

### Vai trò của từng tầng

**ChatGPT / phân tích nghiệp vụ**

Nơi người dùng mô tả mong muốn bằng ngôn ngữ tự nhiên. Mục tiêu là chuyển mong muốn thành workflow, business rule, role/permission và acceptance criteria rõ ràng; không tự suy đoán business rule khi còn mâu thuẫn.

**HTML Prototype**

Là phòng thử nghiệm cho cấu trúc và hành vi cơ bản. Cho phép thay đổi nhiều vòng mà không ảnh hưởng production database. Có thể mô phỏng mở/đóng, chọn ngày, trạng thái, chuyển vai trò, đăng ký, draft/publish, kéo-thả mô phỏng và responsive.

**GitHub Prototype**

Khi prototype ổn định, lưu dưới `prototype/` để có version history, branch, review và có thể triển khai GitHub Pages. Không cần commit mọi bản nháp trong chat; chỉ đưa các bản đã đủ ổn định/chốt vào Git.

**Backend**

Chỉ bắt đầu sau khi cấu trúc/workflow được người dùng chốt. Database không được tự quyết định business logic khi business requirement còn chưa rõ.

**Frontend thật**

Triển khai theo cấu trúc đã chốt và kết nối backend thật. Không tự tạo workflow khác với prototype đã duyệt.

**Figma UX/UI Refinement**

Figma được giữ làm công cụ UX/UI cao cấp và là nguồn chuẩn cho giao diện sau khi implementation đã có nền tảng đúng. Figma đảm nhiệm refinement: typography, spacing, color, components, visual hierarchy, interaction states, responsive và consistency của design system. Không tiêu tốn Figma MCP cho những vòng brainstorm nhỏ khi HTML prototype vẫn chưa chốt.

## 5. Quy trình chốt một chức năng

Một chức năng chỉ được xem là sẵn sàng để triển khai khi đi qua các checkpoint:

1. **Requirement clarified** — hiểu đúng nhu cầu.
2. **Business rules approved** — quy tắc nghiệp vụ chính đã rõ.
3. **HTML prototype reviewed** — người dùng đã xem và thử workflow.
4. **Structure approved** — bố cục và luồng thao tác đã chốt.
5. **Data model reviewed** — bảng, quan hệ, trạng thái, quyền và constraints phù hợp.
6. **Backend implemented** — Supabase/RLS/RPC đã được xây và test.
7. **Frontend implemented** — UI thật hoạt động theo cấu trúc đã chốt.
8. **Figma refinement approved** — UX/UI hoàn thiện đạt yêu cầu.
9. **Browser verification passed** — kiểm tra bằng trình duyệt thật.
10. **CI + PR + merge passed** — required checks và approval đều đạt trước khi merge vào `main`.

## 6. Quy tắc thay đổi sau khi đã chốt

Sau khi UI/workflow được đánh dấu `APPROVED`, không tự ý thay đổi business rule hoặc database trong quá trình implementation.

Nếu phát sinh thay đổi:

```text
CHANGE REQUEST
      ↓
Business impact review
      ↓
Update HTML / Figma
      ↓
User approval
      ↓
Update implementation
```

Mục tiêu là tránh vòng lặp:

```text
code → phát hiện sai → sửa frontend → sửa RPC → sửa migration → test lại
```

## 7. Vai trò người dùng

### Nhân viên

- Xem lịch làm cá nhân.
- Đăng ký khả năng làm cho tuần kế tiếp.
- Có thể đăng ký nhiều ngày/ca phù hợp với part-time.
- Có trạng thái đăng ký và bước **Hoàn thành/Chốt đăng ký lịch làm** để hệ thống biết đã hoàn tất hay chưa.
- Nhận nhắc đăng ký khi chưa hoàn thành.

### Quản lý / Chủ cửa hàng

- Xem lịch theo từng cửa hàng CN1–CN4 hoặc tổng hợp toàn bộ nhân viên.
- Xem đăng ký đã chốt và trạng thái.
- Thực hiện **Xếp lịch tự động**.
- Nhận kết quả ở trạng thái **Draft**.
- Điều chuyển nhân viên giữa các chi nhánh để bù thiếu nhân sự.
- Review và **Publish** lịch chính thức.

## 8. Lịch làm — UX baseline đang được định hình

### Lịch chính thức của nhân viên

- Tuần hiển thị **Thứ Hai → Chủ Nhật**.
- Ngày hiện tại nằm đúng vị trí trong tuần nhưng được **nổi bật**.
- Ví dụ ngày hiện tại là **29/08/2026 (Thứ Bảy)** thì tuần hiển thị là **24/08 → 30/08/2026**.
- Mỗi ngày là một ô.
- Đầu mỗi ô ưu tiên hiển thị rõ **Thứ + ngày**.
- Mỗi ca hiển thị tối thiểu **giờ làm + CN1/CN2/CN3/CN4**.
- Các khung giờ dùng hệ màu thống nhất.
- Không đặt chữ `Lịch chính thức` trong từng ca để tránh rối.

### Đăng ký lịch tuần kế tiếp

- Có đúng **một thanh**: `Đăng ký lịch làm tuần tiếp theo`.
- Thanh có mũi tên mở xuống.
- Khi mở, chỉ được chọn ngày trong phạm vi tuần kế tiếp.
- Form gồm: **ngày, giờ bắt đầu, giờ kết thúc, chi nhánh mong muốn**.
- Nút thao tác là **Đăng ký**.
- Không dùng nút `Thêm ca`.
- Sau khi đăng ký, nhân viên nhìn thấy **tổng quan cả Thứ Hai → Chủ Nhật** theo cách hiển thị gần giống lịch chính thức.
- Có bước **Hoàn thành đăng ký lịch làm / Chốt đăng ký lịch làm**.

## 9. Nhu cầu cửa hàng

Nhu cầu nhân sự là cấu hình theo **cửa hàng**, không phải cấu hình lại cho từng ngày nếu nhu cầu chưa thay đổi.

- Mỗi cửa hàng cấu hình nhu cầu một lần.
- Khi nhu cầu thay đổi, quản lý/chủ cửa hàng cập nhật lại cấu hình của cửa hàng.
- Scheduler sử dụng nhu cầu cửa hàng kết hợp với đăng ký/constraints của nhân viên.

Training, skill level, can-work-alone và mentor là các constraint nghiệp vụ chính thức của workforce scheduling.

## 10. Chấm công và tính tiền công

Form chấm công dự kiến gồm:

- ngày
- cửa hàng
- giờ vào
- giờ ra

Lịch sử gồm:

- ngày làm
- cửa hàng
- giờ vào
- giờ ra
- số giờ công
- thành tiền

Công thức:

```text
thành tiền = số giờ công × đơn giá theo cấp bậc
```

Đơn giá hiện tại:

- Cấp 1: **16.000đ/giờ**
- Cấp 2: **17.000đ/giờ**
- Cấp 3: **19.000đ/giờ**
- Ca mở cửa **05:00–08:00: 21.000đ/giờ**

Cấu hình cấp bậc và đơn giá sẽ do quản lý/chủ cửa hàng quản lý tại giao diện **Nhân sự**; chi tiết màn hình này sẽ được chốt trong giai đoạn design/business review.

## 11. Shift Swap / Đổi ca

Phase 10 đã đưa Shift Swap vào workflow với lịch chính thức:

```text
Ca chính thức
    ↓
Tạo yêu cầu đổi ca
    ↓
PENDING
    ↓
OWNER / người có quyền review
    ↓
APPROVE / REJECT
    ↓
Nếu APPROVE → cập nhật lịch chính thức
```

Validation về availability/conflict là một phần của workflow. Lịch sử request phải được lưu và hiển thị rõ trạng thái.

## 12. Security

- Chỉ publishable key được phép xuất hiện ở frontend.
- Không commit service-role key, database password hoặc secret.
- RLS là lớp bảo mật bắt buộc.
- Mọi backend mới phải chạy trên Supabase (PostgreSQL/RPC/Edge Functions).
- Không quay lại Apps Script cho chức năng mới.

## 13. Migration / Database discipline

Mọi thay đổi database phải là migration dưới:

```text
supabase/migrations/
```

Migration history phải được coi là lịch sử bất biến. Khi phát hiện lệch version/ledger:

1. truy nguyên nguồn gốc;
2. xác định migration nào đã thực sự apply;
3. không rewrite lịch sử tùy tiện;
4. ưu tiên repair migration/ledger theo hướng không phá lịch sử;
5. sau đó chạy fresh-schema reconciliation và regression tests phù hợp.

## 14. Git workflow

Không phát triển trực tiếp trên `main` cho thay đổi chức năng.

```text
main
 ↓
feature / prototype / docs branch
 ↓
CI
 ↓
PR
 ↓
required approval
 ↓
required checks
 ↓
merge
 ↓
main
```

`main` phải luôn ở trạng thái có thể triển khai.

## 15. Repository structure

```text
noibo/
│
├── prototype/                 # HTML prototypes trước backend
│   ├── schedule/
│   ├── attendance/
│   ├── shift-swap/
│   └── ...
│
├── web/                       # Frontend production / GitHub Pages
│
├── supabase/                  # Backend + database
│   ├── migrations/
│   ├── functions/
│   └── tests/
│
├── print-agent/               # Agent LAN cho printer
│
├── docs/                      # Requirements, architecture, decisions
│   ├── requirements/
│   ├── business-rules/
│   ├── architecture/
│   ├── decisions/
│   └── checkpoints/
│
├── PROJECT_CONTROL/           # Manifest / architecture / status / changelog
│
└── .github/
    └── workflows/
```

## 16. Prototype conventions

Prototype không được kết nối production database trừ khi có lý do được xác nhận rõ ràng.

Mỗi prototype nên có:

- tên chức năng;
- vai trò người dùng;
- trạng thái màn hình;
- dữ liệu giả lập rõ ràng;
- ghi chú rằng **prototype chưa phải production**.

Khi một prototype được chốt, lưu phiên bản dưới `prototype/` và ghi nhận trạng thái `APPROVED` trong tài liệu/checkpoint tương ứng.

## 17. Trạng thái / ký hiệu checkpoint

- `DONE` — đã hoàn thành.
- `ACTIVE` — đang hoạt động.
- `IN REVIEW` — đang được người dùng xem xét.
- `NEEDS CHANGE` — chưa đúng nhu cầu, cần sửa.
- `BLOCKED` — bị chặn bởi dependency hoặc giới hạn môi trường.
- `TODO` — chưa bắt đầu.
- `APPROVED` — người dùng đã chốt và có thể làm baseline triển khai.

## 18. Current project checkpoint

### Phase 10

- **Status:** `DONE`
- Shift Swap workflow: hoàn thành.
- Password reset flow: đã được khắc phục.
- GitHub protected `main`: đang hoạt động.
- Required aggregate CI gate: `Workforce V2 CI`.
- PR approval gate: 1 approval.

### Sau Phase 10

- **Post-Phase-10 stabilization:** hoàn thành ở mức governance/release gate.
- **Architecture Review / Product Alignment:** đang thực hiện.
- **Lịch làm:** đang được thiết kế lại theo nhu cầu UX mới; **chưa bắt đầu backend redesign** cho phần thiết kế mới.

## 19. Working agreement cho các cuộc trò chuyện tiếp theo

Khi một cuộc trò chuyện mới bắt đầu hoặc context cũ không còn đầy đủ, hãy đọc README này trước để khôi phục:

1. kiến trúc kỹ thuật;
2. workflow làm việc;
3. các quyết định nghiệp vụ đã chốt;
4. trạng thái Phase hiện tại;
5. cấu trúc prototype/backend/frontend;
6. nguyên tắc prototype trước backend;
7. Figma là nguồn chuẩn UX/UI sau khi implementation cần refinement;
8. `main` là baseline production, không dùng trực tiếp cho thử nghiệm.

Khi yêu cầu mới chưa rõ, không tự đoán business rule. Hãy chỉ ra phần chưa rõ, phương án, tác động và chờ quyết định trước khi triển khai phần có rủi ro cao.
