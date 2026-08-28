# MAGASIN NOIBO

Hệ thống vận hành nội bộ MAGASIN.

## Kiến trúc chuẩn

- **Frontend:** GitHub Pages (`web/`)
- **Backend:** Supabase
- **Authentication:** Supabase Auth
- **Database:** Supabase PostgreSQL
- **Authorization:** PostgreSQL RLS + RPC
- **Email:** SMTP provider cấu hình trong Supabase Auth
- **Printer:** Print Agent cục bộ tại cửa hàng, kết nối Supabase queue → LAN → HPRT TL31E

**Google Apps Script, Google Sheets và `google.script.run` đã được loại khỏi kiến trúc dự án.** Không tạo thêm `.gs`, Apps Script Web App hoặc bridge cho tính năng mới.

## Cấu trúc

```text
web/                 Frontend GitHub Pages
supabase/            Database migrations và backend runtime
print-agent/         Agent mạng LAN cho máy in HPRT TL31E
docs/                Tài liệu kiến trúc/vận hành
PROJECT_CONTROL/     Manifest, architecture, status, changelog
```

## Source of truth

- GitHub `main` là source of truth của mã nguồn và migration.
- Supabase là source of truth của dữ liệu runtime.

## Runtime

```text
Browser → GitHub Pages → Supabase Auth/PostgreSQL/RPC
                                  ↓
                              nghiệp vụ
                                  ↓
                    Print Agent (khi cần) → LAN → printer
```

## Workforce scheduling

Nhân viên khai báo khoảng thời gian có thể làm, không bị giới hạn bởi ca cố định. OWNER cấu hình nhu cầu nhân sự theo thời gian, cửa hàng, kỹ năng và minimum/target/maximum. Scheduler tạo DRAFT; quản lý review và publish lịch chính thức.

Training, skill level, can-work-alone và mentor là constraint chính thức.

## Security

Chỉ publishable key được phép xuất hiện ở frontend. Không commit service-role key, database password hay secret. RLS là lớp bảo mật bắt buộc.

## Development rule

Mọi thay đổi database phải là migration dưới `supabase/migrations/`. Mọi backend mới phải chạy trên Supabase (RPC/Edge Functions/PostgreSQL), không quay lại Apps Script.
