# Manager Prototype Status

## Baseline

**Canonical Manager prototype:**
`PROJECT_CONTROL/prototypes/manager/magasin_noibo_manager.html`

**Current status:** UI structure temporarily locked after review of Workforce, Nhân sự, Chấm công, KPI, Đổi ca, Academy and Cài đặt flows.

## Locked Manager decisions

### Navigation / shell

- Manager uses the Employee visual language.
- Header contains the hamburger/menu control.
- Sidebar is hidden/collapsible rather than permanently occupying the page.

### Workforce

Workforce is the Manager scheduling workspace:

```text
Nhu cầu nhân sự
    ↓
Lịch đăng ký & review
    ↓
Tự động xếp lịch / Manager chỉnh sửa
    ↓
Phát hành lịch
```

The review view is a weekly calendar of all employee registrations, similar to Employee Lịch làm.

Each registration shows:

- employee name
- official/home branch
- requested time
- `Hỗ trợ CNx` when the employee wants to support another branch

Manager can edit one registration by clicking its card. The edit modal contains only employee name/home branch, GIỜ VÀO, GIỜ RA, Xóa and Lưu.

If a registration is edited or deleted in the prototype, the old card remains visible as a neutral fourth state, with strike-through text, and moves to the end of that day's column. This is an audit/recovery visualization and should later be backed by real version/history records.

`Phát hành lịch` shows the final Manager-arranged schedule in the same visual language as the official Lịch làm page. Manager reviews it once more, then publishes.

### Manager publish authority

Manager may Publish the schedule within authorized store scope. Publication must remain server-side and must pass final revalidation.

### Shift colors

The UI uses one shared time-slot color contract:

- `06:00–14:00` → yellow
- `12:00–17:00` → red
- `14:00–22:00` → cyan

Support assignments keep the time-slot color and use a blue indicator to distinguish support intent.

### Employee dependency

Employee remains the source-of-truth role for employee-facing registration/availability behavior. Manager consumes that data, reviews it and turns it into the official schedule.

### Downstream dependencies

```text
Workforce Publish
      ↓
Official work schedule
      ↓
Attendance
      ↓
KPI / reporting
```

Shift swap can affect the official schedule only through its approved workflow and must respect schedule/conflict/hours rules.

## Technical handoff

The existing repository already contains Workforce V2 technical documentation for generation, validation and publish. The new Manager handoff adds UI/business decisions that were finalized during prototype review.

Read next:

1. `PROJECT_CONTROL/MANAGER_BACKEND_HANDOFF.md`
2. `PROJECT_CONTROL/PHASE7_MANAGER_UI.md`
3. `PROJECT_CONTROL/PHASE8_PUBLISH_WORKFLOW.md`
4. `PROJECT_CONTROL/SHIFT_SWAP_BUSINESS_LOGIC.md`
5. `PROJECT_CONTROL/MAGASIN_DATABASE_SCHEMA.md`

## Do not do

- Do not create another canonical `manager_vXX.html` file.
- Do not treat frontend labels, demo percentages, or sample names as database truth.
- Do not let the browser directly write official schedule rows.
- Do not hard-delete registration history without an explicit future decision.
- Do not redesign Workforce flow before backend state/API mapping is agreed.

## Next phase

**Backend development for Manager.**

The next implementation step is to map the approved UI actions to the existing Workforce V2 RPC/database state machine, beginning with registration ingestion, draft generation/assignment, review validation, registration version/history handling, and atomic Publish.