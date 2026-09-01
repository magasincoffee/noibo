# MAGASIN — MIGRATION MAP V1

## 1. Mục tiêu

Chuyển `magasincoffee/magasincoffee.github.io` thành **repository source-of-truth duy nhất** cho hệ thống nội bộ, loại bỏ mô hình:

`noibo → copy web → rewrite → github.io → push ngược`

Sau migration, kiến trúc mục tiêu là:

```text
github.io/main
├── Frontend
├── CI/CD
├── PROJECT_CONTROL / docs
├── Supabase migrations / tests
├── Print Agent
└── Scheduler
        │
        ├── GitHub Pages
        └── Supabase
```

`noibo` sẽ chuyển thành **ARCHIVE / LEGACY** sau khi các quality gates production PASS.

## 2. Nguyên tắc migration

1. Không rewrite lịch sử migration production.
2. Không thay đổi Supabase schema chỉ vì mục tiêu chuyển repo.
3. Không giữ hai implementation cho cùng một nghiệp vụ.
4. Một repository source-of-truth.
5. Một pipeline deploy chính.
6. Không workflow nào checkout `noibo` để build production sau migration.
7. Không workflow nào tự ghi ngược production source sau deploy.
8. Attendance UI giữ nguyên giao diện V40; backend/RPC là security boundary.

## 3. Quy ước trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| KEEP | Giữ ở vị trí hiện tại của target sau khi migration |
| MOVE | Chuyển source từ `noibo` sang `github.io` |
| MERGE | Hai repo có phiên bản khác nhau; hợp nhất có kiểm soát |
| DELETE | Không đưa sang kiến trúc mới |
| ARCHIVE | Giữ để tra cứu/lịch sử nhưng không còn runtime |

## 4. Nguồn hiện tại

- `noibo/main` SHA: `157b5f6deaa3e372c5fcc863f3688df27b4926bf`
- `github.io/main` SHA: `1227e73c2d86e02ba5768fc1714cd3d8261d3efd`

## 5. MAP — NOIBO ROOT / CONTROL / DOCS

| Path | Action | Target | Ghi chú |
|---|---|---|---|
| `.github/workflows/workforce-v2.yml` | MOVE | `github.io/.github/workflows/workforce-v2.yml` | Giữ nếu CI/workforce vẫn dùng; audit trigger trước khi bật |
| `README.md` | MERGE | `github.io/README.md` | Hợp nhất tài liệu, đổi source-of-truth sang `github.io` |
| `index.html` | MERGE | `github.io/index.html` | Không giữ hai root login |
| `PROJECT_CONTROL/CHANGELOG.md` | MOVE | `github.io/PROJECT_CONTROL/CHANGELOG.md` | Canonical changelog |
| `PROJECT_CONTROL/MAGASIN_DATABASE_SCHEMA.md` | MOVE | `github.io/PROJECT_CONTROL/MAGASIN_DATABASE_SCHEMA.md` | Giữ governance DB |
| `PROJECT_CONTROL/MAGASIN_DEPENDENCY_MAP.md` | MOVE | `github.io/PROJECT_CONTROL/MAGASIN_DEPENDENCY_MAP.md` | Cập nhật source-of-truth mới |
| `PROJECT_CONTROL/MIGRATION_RECONCILIATION.md` | MOVE | `github.io/PROJECT_CONTROL/MIGRATION_RECONCILIATION.md` | Giữ migration lineage |
| `PROJECT_CONTROL/PHASE10_SHIFT_SWAP.md` | MOVE | `github.io/PROJECT_CONTROL/PHASE10_SHIFT_SWAP.md` | Historical + status |
| `PROJECT_CONTROL/PHASE6_EMPLOYEE_UI.md` | MOVE | `github.io/PROJECT_CONTROL/PHASE6_EMPLOYEE_UI.md` | Historical + status |
| `PROJECT_CONTROL/PHASE7_MANAGER_UI.md` | MOVE | `github.io/PROJECT_CONTROL/PHASE7_MANAGER_UI.md` | Historical + status |
| `PROJECT_CONTROL/PHASE8_CHECKLIST.md` | MOVE | `github.io/PROJECT_CONTROL/PHASE8_CHECKLIST.md` | Historical + status |
| `PROJECT_CONTROL/PHASE8_PUBLISH_WORKFLOW.md` | MOVE | `github.io/PROJECT_CONTROL/PHASE8_PUBLISH_WORKFLOW.md` | Reconcile with new CI/CD |
| `PROJECT_CONTROL/POST_PHASE10_LOCAL_RECONCILIATION.md` | MOVE | `github.io/PROJECT_CONTROL/POST_PHASE10_LOCAL_RECONCILIATION.md` | Historical |
| `PROJECT_CONTROL/POST_PHASE10_PRODUCTION_AUDIT.md` | MOVE | `github.io/PROJECT_CONTROL/POST_PHASE10_PRODUCTION_AUDIT.md` | Update conclusions after migration |
| `PROJECT_CONTROL/SCHEDULE_IMPLEMENTATION_STATUS_V1.md` | MOVE | `github.io/PROJECT_CONTROL/SCHEDULE_IMPLEMENTATION_STATUS_V1.md` | Keep |
| `PROJECT_CONTROL/SCHEDULE_READ_V1_SMOKE_MATRIX.md` | MOVE | `github.io/PROJECT_CONTROL/SCHEDULE_READ_V1_SMOKE_MATRIX.md` | Keep |
| `PROJECT_CONTROL/STATUS.md` | MERGE | `github.io/PROJECT_CONTROL/STATUS.md` | Must be rewritten to new architecture |
| `PROJECT_CONTROL/WORKFORCE_V2_INTEGRATION_AUDIT.md` | MOVE | `github.io/PROJECT_CONTROL/WORKFORCE_V2_INTEGRATION_AUDIT.md` | Keep |
| `PROJECT_CONTROL/WORKFORCE_V2_MERGE_GATE.md` | MOVE | `github.io/PROJECT_CONTROL/WORKFORCE_V2_MERGE_GATE.md` | Keep |
| `PROJECT_CONTROL/phase10-browser-verification.md` | MOVE | `github.io/PROJECT_CONTROL/phase10-browser-verification.md` | Historical |
| `PROJECT_CONTROL/prototypes/schedule/*` | ARCHIVE | `github.io/PROJECT_CONTROL/prototypes/schedule/*` | Không dùng runtime; giữ để trace lịch sử |

## 6. MAP — NOIBO DOCUMENTATION

| Path | Action | Target | Ghi chú |
|---|---|---|---|
| `docs/architecture/.keep` | MOVE | `github.io/docs/architecture/.keep` | Placeholder |
| `docs/architecture/MAGASIN_PRINT_ARCHITECTURE.md` | MOVE | `github.io/docs/architecture/MAGASIN_PRINT_ARCHITECTURE.md` | Keep |
| `docs/architecture/MAGASIN_SCHEDULER_RULES_V1.md` | MOVE | `github.io/docs/architecture/MAGASIN_SCHEDULER_RULES_V1.md` | Keep |
| `docs/architecture/MAGASIN_SCHEDULE_READ_API_V1.md` | MOVE | `github.io/docs/architecture/MAGASIN_SCHEDULE_READ_API_V1.md` | Keep |
| `docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md` | MOVE | `github.io/docs/architecture/MAGASIN_WORKFORCE_ARCHITECTURE_V2.md` | Keep |
| `docs/architecture/MAGASIN_WORKFORCE_RPC_API_V1.md` | MOVE | `github.io/docs/architecture/MAGASIN_WORKFORCE_RPC_API_V1.md` | Keep |
| `docs/architecture/PRINT_DATA_MODEL_REFERENCE.sql` | MOVE | `github.io/docs/architecture/PRINT_DATA_MODEL_REFERENCE.sql` | Reference, không runtime |
| `docs/architecture/README.md` | MOVE | `github.io/docs/architecture/README.md` | Keep |
| `docs/architecture/TL31E_PROTOCOL_FINDINGS.md` | MOVE | `github.io/docs/architecture/TL31E_PROTOCOL_FINDINGS.md` | Keep |
| `docs/database/.keep` | MOVE | `github.io/docs/database/.keep` | Placeholder |
| `docs/database/README.md` | MOVE | `github.io/docs/database/README.md` | Keep |
| `docs/workflows/.keep` | MOVE | `github.io/docs/workflows/.keep` | Placeholder |
| `docs/workflows/README.md` | MOVE | `github.io/docs/workflows/README.md` | Rewrite for one-pipeline model |

## 7. MAP — NOIBO PRINT AGENT

| Path | Action | Target | Ghi chú |
|---|---|---|---|
| `print-agent/.env.example` | MOVE | `github.io/print-agent/.env.example` | Không chứa secret thật |
| `print-agent/README.md` | MOVE | `github.io/print-agent/README.md` | Keep |
| `print-agent/package.json` | MOVE | `github.io/print-agent/package.json` | Keep |
| `print-agent/src/printers/raw-tcp.js` | MOVE | `github.io/print-agent/src/printers/raw-tcp.js` | Keep |
| `print-agent/src/protocol/escpos.js` | MOVE | `github.io/print-agent/src/protocol/escpos.js` | Keep |
| `print-agent/src/protocol/tspl.js` | MOVE | `github.io/print-agent/src/protocol/tspl.js` | Keep |
| `print-agent/src/server.js` | MOVE | `github.io/print-agent/src/server.js` | Keep |
| `print-agent/tools/Probe-TL31EPorts.ps1` | ARCHIVE | `github.io/print-agent/tools/Probe-TL31EPorts.ps1` | Diagnostic tool, không runtime |

## 8. MAP — NOIBO SCHEDULER

| Path | Action | Target | Ghi chú |
|---|---|---|---|
| `scheduler/package.json` | MOVE | `github.io/scheduler/package.json` | Keep |
| `scheduler/src/api.js` | MOVE | `github.io/scheduler/src/api.js` | Keep |
| `scheduler/src/index.js` | MOVE | `github.io/scheduler/src/index.js` | Keep |
| `scheduler/src/validator.js` | MOVE | `github.io/scheduler/src/validator.js` | Keep |
| `scheduler/test/scheduler.test.js` | MOVE | `github.io/scheduler/test/scheduler.test.js` | Keep |
| `scheduler/test/validator.test.js` | MOVE | `github.io/scheduler/test/validator.test.js` | Keep |

## 9. MAP — NOIBO SUPABASE

| Path/nhóm | Action | Target | Ghi chú |
|---|---|---|---|
| `supabase/README.md` | MOVE | `github.io/supabase/README.md` | Canonical DB repository docs |
| `supabase/migrations/20260828000100_initial_schema.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828000200_username_login.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828000300_api_grants.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828000400_fix_profile_login_rls.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828000500_frontend_read_api.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828000600_github_integration_test.sql` | MOVE | Same path | Historical migration; không xóa tùy tiện |
| `supabase/migrations/20260828000700_cleanup_github_integration_test.sql` | MOVE | Same path | Giữ lineage |
| `supabase/migrations/20260828000800_fix_pending_username_login.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828000900_approval_workflow.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828001000_approval_constraints.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828001100_schedule_workforce_v2.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828001200_workforce_data_integrity_v1.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828001300_workforce_rpc_api_v1.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828001400_workforce_generation_list_api.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828001500_workforce_review_publish_v1.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260828001600_attendance_schedule_link_v1.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260829000100_workforce_generation_updated_at_fix.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260829000200_seed_initial_magasin_stores.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260829000300_shift_swap_schedule_integration_v1.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260829000400_shift_swap_read_api_v2.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260831000100_schedule_read_api_v1.sql` | MOVE | Same path | Không rewrite |
| `supabase/migrations/20260901000100_auto_attendance_from_approved_schedule_v1.sql` | MOVE | Same path | Latest Attendance migration |
| `supabase/migrations/20260901140000_manual_attendance_from_schedule_v1.sql` | MOVE | Same path | Latest manual Attendance migration |
| `supabase/tests/schedule_read_v1_controlled_publish_attendance.sql` | MOVE | Same path | Keep |
| `supabase/tests/workforce_v2_review_publish_regression.sql` | MOVE | Same path | Keep |

## 10. MAP — NOIBO WEB → GITHUB.IO ROOT

Các file dưới đây đều chuyển từ `noibo/web/*` thành root tương ứng của `github.io`.

| Noibo path | Action | Ghi chú |
|---|---|---|
| `web/app.js` | KEEP/MERGE | SHA hiện giống production |
| `web/attendance-auto-ui.js` | REPLACE/MERGE | Noibo bản mới hơn; canonical Attendance UI |
| `web/attendance-workforce-ui.js` | KEEP/MERGE | SHA giống production |
| `web/auth-runtime-v3.js` | ARCHIVE → DELETE sau reference audit | Có v4; chỉ giữ nếu còn reference thực tế |
| `web/auth-runtime-v4.js` | MERGE | Chọn noibo canonical, tích hợp route production trực tiếp |
| `web/auth-security-v2.md` | KEEP/MERGE | SHA giống production |
| `web/employee-v40-runtime.html` | MERGE | Chọn bản source-of-truth mới; loại bỏ `renderAttendance()` destructive |
| `web/employee-v40.html` | MERGE | Giữ layout V40; không để production rewrite thay source |
| `web/forgot-password-runtime.js` | MERGE | Kiểm tra khác biệt trước khi chọn |
| `web/forgot-password-v1.md` | KEEP/MERGE | SHA giống production |
| `web/index.html` | MERGE | Canonical login entry |
| `web/manager-auth-entry.js` | KEEP/MERGE | SHA giống production |
| `web/manager-shell.html` | MERGE | Chọn source canonical; loại bỏ legacy auth surface nếu còn |
| `web/manager-workforce-ui.js` | KEEP/MERGE | SHA giống production |
| `web/owner-access-approval.js` | KEEP/MERGE | SHA giống production |
| `web/pending-access.html` | MERGE | Kiểm tra production-only UI trước khi chọn |
| `web/schedule-ui-v2.js` | KEEP/MERGE | SHA giống production |
| `web/schedule-ui.js` | ARCHIVE → DELETE sau reference audit | Có v2; không giữ hai implementation nếu v1 không còn reference |
| `web/schedule.html` | MERGE | Có khác biệt production; phải review |
| `web/secure-app-runtime.html` | MERGE | Có khác biệt production; phải review |
| `web/security-runtime.js` | KEEP/MERGE | SHA giống production |
| `web/shift-swap-workforce-ui.js` | KEEP/MERGE | SHA giống production |
| `web/supabase-config.js` | KEEP/MERGE | SHA giống production |
| `web/workforce-ui.js` | KEEP/MERGE | SHA giống production |

## 11. MAP — PRODUCTION-ONLY FILES

| `github.io` path | Action | Ghi chú |
|---|---|---|
| `.nojekyll` | KEEP | Cần cho GitHub Pages static root |
| `favicon.svg` | KEEP | Canonical favicon |
| `employee/index.html` | KEEP/MERGE | Production route wrapper; sẽ trở thành canonical role wrapper |
| `manager/index.html` | KEEP/MERGE | Production route wrapper; sẽ trở thành canonical role wrapper |
| `.github/workflows/deploy.yml` | MERGE → REWRITE | Bỏ checkout `noibo`, bỏ cron 15 phút, bỏ push ngược source; trở thành pipeline duy nhất |
| `.github/workflows/attendance-ui-finalize.yml` | DELETE | Legacy post-deploy self-modifying workflow |
| `.github/workflows/patch-attendance-runtime.yml` | DELETE | One-off patch workflow; không đưa sang architecture mới |

## 12. PRODUCTION FILES KHÁC NHAU — REVIEW GATE

| File | Current noibo | Current github.io | Quyết định dự kiến |
|---|---|---|---|
| `auth-runtime-v4.js` | `b35158265149cd14f3bcb2a02035127680b2e025` | `d104c6b9d0e3f2486949fd65b980beb73db67f97` | MERGE; giữ route `/employee/` + `/manager/` trực tiếp |
| `employee-v40-runtime.html` | `5aa945dd717f56f791f0a3b3fad895ab095a9c67` | `61bee4f9f370058affec4a9ea970493d8a14d78b` | MERGE; noibo là baseline mới, không destructive render |
| `employee-v40.html` | `e246156fca536db9d013c69abc2bbf0034308123` | `9e801ed11c64bf850c5d51ce123b6938a25a610b` | MERGE; ưu tiên layout V40 chuẩn |
| `forgot-password-runtime.js` | `27b58f9f3e6bde6c8cc4576fbb16f9010fb4d5ae` | `cf82e4b1342b96c32fded3e36b7c3fe5a1d4f12b` | MERGE; review route/production-only changes |
| `index.html` | `c36a96a57d7728ccd9b09dc8c006be4e79dcbae7` | `37a1ace067b990517c66acc92a3b9e2afd9a2141` | MERGE; một login source duy nhất |
| `manager-shell.html` | `45200317c0794818fcc407aa747f8a29ea98cc84` | `a6356de2ca51b881c5c1cd5c60257eb8f0429356` | MERGE; preserve needed Manager production UX |
| `pending-access.html` | `ced14ad4295f03b9c08bdb6bc60510f9d1213eb3` | `dfbdb41bee8b860a6a913c689de733d472934653` | MERGE |
| `schedule.html` | `4e1cf7500cc31f81a2b2f7c77d20771b32a0129e` | `804f795bdd68477347e447f6b4084bf9383c5f3d` | MERGE |
| `secure-app-runtime.html` | `ce5a71a52351ee68a91bb9484cbbcb9d7ba6e2f3` | `c24a36eee42161cc1f130ff950ba521395ef6294` | MERGE |

## 13. DUPLICATE / LEGACY POLICY

### Auth

Canonical: `auth-runtime-v4.js`

`auth-runtime-v3.js` chỉ archive tạm thời, sau đó DELETE khi không còn reference.

### Schedule

Canonical: `schedule-ui-v2.js`

`schedule-ui.js` chỉ archive tạm thời, sau đó DELETE khi không còn reference.

### Attendance

Canonical flow:

```text
Employee V40
    ↓
Attendance UI
    ↓
Supabase RPC
    ↓
Attendance tables
```

Không dùng:

```text
bridge + guard + MutationObserver + polling + self-repair
```

### CI/CD

Canonical: **01 deployment pipeline**.

Không giữ workflow tự chỉnh source production sau deploy.

## 14. QUALITY GATES TRƯỚC KHI ARCHIVE NOIBO

- [ ] `github.io/main` build được mà không checkout `noibo`.
- [ ] GitHub Pages deploy từ `github.io/main`.
- [ ] Employee login PASS.
- [ ] Manager/Owner login PASS.
- [ ] Employee V40 layout PASS.
- [ ] Schedule read PASS.
- [ ] Attendance manual PASS.
- [ ] Attendance auto PASS.
- [ ] Auto lần 2 không tạo duplicate.
- [ ] Ca tương lai không được auto chấm.
- [ ] Ca hôm nay chưa kết thúc không được auto chấm.
- [ ] Payroll period 01–15 / 16–cuối tháng PASS.
- [ ] Supabase RLS/RPC PASS.
- [ ] Migration lineage không bị rewrite.
- [ ] Không còn runtime dependency vào `noibo`.
- [ ] Documentation phản ánh architecture mới.

## 15. Target Architecture

```text
                    github.io/main
                 SOURCE OF TRUTH DUY NHẤT
                           │
                ┌──────────┴──────────┐
                │                     │
         GitHub Pages             GitHub CI/CD
        Frontend production      Build + Deploy
                │                     │
                └──────────┬──────────┘
                           ▼
                 Employee / Manager V40
                           │
                           ▼
                       Supabase
              Auth / PostgreSQL / RLS / RPC
                     │             │
                     ▼             ▼
                Workforce      Attendance
                 Schedule       Payroll data

NOIBO → ARCHIVE / LEGACY
```

## 16. Status

This document is **planning/control-only**. It does not itself migrate code or change the Supabase database.

The first implementation PR should consume this map and perform only the repository consolidation that has been explicitly reviewed.