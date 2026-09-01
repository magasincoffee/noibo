# MAGASIN NOIBO — Manager Backend Handoff

## 1. Baseline

Manager UI baseline is the single canonical prototype:

`PROJECT_CONTROL/prototypes/manager/magasin_noibo_manager.html`

This file is the approved Manager prototype baseline after the Workforce structure was locked. Do not create another v22/v23 HTML file for the same baseline. Future UI changes should update this canonical file only after explicit approval.

Employee remains the source-of-truth role for employee-facing behavior. Manager is the operational control layer built on top of Employee registration/availability, official schedules, attendance, KPI, Academy, tasks, and shift-swap workflows.

## 2. Manager business architecture

```text
EMPLOYEE INPUTS
availability / registration / requests
            ↓
       WORKFORCE
 demand → registration/review → scheduling → final review
            ↓
     MANAGER PUBLISH
            ↓
   OFFICIAL SCHEDULE
            ↓
Employee execution → Attendance → KPI / payroll-related reporting
```

Manager owns day-to-day store operations within assigned store scope. Owner remains the governance/escalation role defined by the approval matrix.

## 3. Workforce: three UI stages

### A. Nhu cầu nhân sự

Manager defines the staffing need by day/shift and branch. The UI is the operational expression of staffing requirements, not the employee registration list.

Conceptual data:

- store / branch scope
- business date
- shift start/end or split interval
- minimum / target / maximum staffing requirement
- optional skill requirement / role requirement

Backend must scope every write/read to the Manager's authorized store scope.

### B. Lịch đăng ký & review

This view shows all employee registrations for the week in a calendar layout similar to Employee "Lịch làm".

Each registration card contains:

- employee name
- employee's official/home branch
- requested time
- optional `Hỗ trợ CNx` marker when the employee belongs to another home branch but wants to support CNx

Important rule:

`CNx` beside the employee name means the employee's official/home branch. It does **not** mean the employee will necessarily work at that branch in the final schedule.

`Hỗ trợ CNx` means the employee is willing/requesting to work at another branch when that branch is short-staffed.

### C. Phát hành lịch

This is the final read-only review of the Manager-arranged schedule. The layout should mirror the official Employee "Lịch làm" representation as closely as practical.

The Manager checks the final schedule and publishes it. Once published, it becomes the official schedule visible to employees.

## 4. Automatic scheduling

The `Tự động xếp lịch` action is a scheduler request, not direct publication.

Expected flow:

```text
employee registrations
+ staffing demand
+ employee eligibility
+ branch support preferences
+ availability/unavailability
+ skills/qualifications
+ existing official schedule conflicts
+ hours/rest constraints
        ↓
create / update DRAFT generation
        ↓
review validation
        ↓
Manager edits if necessary
        ↓
final validation
        ↓
Manager Publish
```

The UI may show:

- Đã xếp
- Chưa xếp
- Coverage dự kiến

These are review indicators. They do not replace server-side validation.

## 5. Manager editing of an employee registration

Clicking an individual registration card opens a hidden modal containing only:

- employee name
- home branch
- GIỜ VÀO
- GIỜ RA
- Xóa
- Lưu

Save/update and delete are not the same as publishing the schedule.

### Edit history behavior agreed for the prototype

When Manager changes a registration time:

1. Keep the old registration as a historical/archived record.
2. Render the old card in a neutral fourth color, outside the three shift colors.
3. Strike through the old card text.
4. Move the archived card to the end of that day's column.
5. Create/show the updated current registration with the normal time-based color.

When Manager deletes a registration:

1. Do not hard-remove it from the UI/history view.
2. Convert it to the same neutral archived state.
3. Mark it as `Đã xóa`.
4. Move it to the end of the day.

This preserves a recoverable operational trail so a deleted/changed registration can later be restored or considered for another branch that has a staffing shortage.

For the real backend, use a status/history model rather than relying on DOM state. Recommended conceptual states:

`ACTIVE` → current registration
`EDITED` → superseded by a new registration/version
`DELETED` → intentionally removed by Manager but retained for audit/recovery

Do not implement hard delete for registration history unless explicitly approved later.

## 6. Cross-branch support

Branch support is a first-class Workforce concern.

Example:

```text
Minh Anh · CN1
Hỗ trợ CN2
```

means:

- home branch = CN1
- requested/support branch = CN2

The final scheduler may assign the employee to CN2 only when eligibility and operational constraints allow it.

A support preference is not an automatic assignment.

## 7. Official schedule publication

The system state lifecycle remains:

```text
DRAFT
  ├─ review APPROVED + valid → REVIEWED
  ├─ review REJECTED          → CANCELLED
  └─ assignment edits remain DRAFT

REVIEWED
  └─ publish → final revalidation → PUBLISHED
                                  + work_schedules APPROVED
```

Manager has the authority to Publish within the Manager's authorized store scope, according to the approved approval matrix.

Publish must be a server-side transaction. Browser code must not directly write official `work_schedules` rows.

The existing Workforce V2 publish workflow already specifies final validation and atomic publication; this document adds the UI/business decisions agreed during Manager prototype design.

## 8. Final validation before Publish

At minimum, the server must re-check the conditions already defined by Workforce V2:

- active employee status
- store/branch eligibility
- availability
- unavailable overlap
- skill qualification
- draft overlap
- official schedule conflicts
- daily hours
- weekly hours
- minimum rest across dates
- mentor requirement when applicable
- staffing coverage using split time intervals

If final validation fails, the generation must not become officially published.

## 9. Attendance relationship

After publication:

```text
work_schedules (official)
        ↓
attendance / check-in/out
        ↓
hours_worked / pay-related amount
        ↓
Manager correction / review
        ↓
KPI and reporting
```

Manager has the operational ability to correct attendance records within permission scope, including handling abnormal or over-hours records. Attendance corrections should be audited on the backend.

## 10. Shift swap relationship

Employee submits a shift-swap request.
Manager reviews it against:

- employee eligibility
- schedule conflict
- branch/store scope
- target shift validity
- hours/rest implications
- attendance/pay impact where applicable

Approval of a swap must not silently bypass Workforce or official schedule conflict rules. The approved change must be reflected consistently in the official schedule and downstream attendance logic according to the existing Shift Swap business rules.

## 11. KPI and Academy relationship

Manager reads KPI at two levels:

- store KPI
- employee KPI

Employee detail is the operational 360 view connecting:

`attendance + work completion + process compliance + inventory accuracy + Academy + violations`

Academy remains a capability/progression domain. A low Academy score may be a Manager action item, but the KPI score itself should not be fabricated in the frontend.

## 12. Security and authorization

UI permissions are not security boundaries.

All Manager operations must be enforced by backend/RPC authorization using store scope and role.

Conceptually:

```text
Manager
  ├─ read/write assigned store scope
  ├─ review workforce
  ├─ edit draft/registration state
  ├─ correct attendance within policy
  ├─ review shift swaps
  └─ publish official schedule

Owner
  └─ governance / cross-store / override permissions
```

Exact Owner overrides remain governed by the approval matrix and must be documented before implementation.

## 13. Prototype versus backend behavior

The current canonical HTML is a prototype. Several actions are visual/simulated.

Backend implementation must not infer business truth from prototype labels. Use the agreed business architecture and server-side data/state as the source of truth.

Particularly, these are prototype interactions that require real backend implementation later:

- automatic scheduling
- registration edits
- registration archive/history
- coverage calculation
- conflict validation
- review state transition
- publish transaction
- cross-branch support assignment
- attendance correction audit

## 14. Recommended backend entities / relationships

Use the repository's existing Workforce V2 schema where available. Conceptually the Manager flow needs a consistent relationship between:

`employees`
→ employee home branch / active status / skill eligibility

`availability / unavailable periods`
→ employee registration constraints

`workforce staffing requirements`
→ required coverage by store/date/time

`schedule generation`
→ DRAFT / REVIEWED / PUBLISHED lifecycle

`schedule generation assignments`
→ draft employee/shift assignments

`work_schedules`
→ official published schedule

`attendance`
→ actual hours / pay-related values

`shift swap requests`
→ requests that can affect official scheduling

`tasks / KPI / Academy`
→ operational performance and capability data

Any new registration-history table/versioning should integrate with existing design rather than duplicating schedule truth.

## 15. Frontend source-of-truth rule

For future development in a new ChatGPT conversation:

1. Read `PROJECT_CONTROL/prototypes/manager/magasin_noibo_manager.html` first.
2. Read this `MANAGER_BACKEND_HANDOFF.md` for Manager business behavior.
3. Read `PHASE7_MANAGER_UI.md` and `PHASE8_PUBLISH_WORKFLOW.md` for existing Workforce V2 technical constraints.
4. Read `SHIFT_SWAP_BUSINESS_LOGIC.md` before changing swap behavior.
5. Never assume an old `vXX` local file is current.

The canonical Manager HTML is intentionally singular.

## 16. Current status

Manager prototype structure is locked for the current phase.

Current major locked decision:

> Employee is the behavioral source-of-truth; Manager is the operational control layer; Manager may Publish the official schedule within authorized store scope.

Next backend work should implement the data/state/API/RPC behavior behind this approved UI rather than redesigning the UI flow.