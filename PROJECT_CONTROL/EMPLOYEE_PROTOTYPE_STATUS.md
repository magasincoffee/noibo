# MAGASIN Employee Prototype — Continuity Status

## Purpose

This document is the continuity checkpoint for the MAGASIN NOIBO Employee prototype work. It records the current prototype scope, UI decisions, working source references, and the last completed change so future iterations do not lose context.

## Current scope

The current work is **prototype-first** for the Employee experience. Do not treat the prototype as the production Workforce V2 implementation.

### Employee prototype areas

- Tổng quan
- Lịch làm
- Chấm công
- Tồn hàng
- Đổi ca
- Thông báo
- Thông tin cá nhân
- Cài đặt
- Academy / năng lực where present in the prototype reference

## Source hierarchy

1. Canva: `MAGASIN NOIBO — Bản đồ giao diện Employee · Manager · Owner` — UI/UX reference.
2. Conversation prototype: `magasin_noibo_employee_v22(2).html` — current standalone Employee prototype reference.
3. GitHub: `magasincoffee/noibo` — canonical repository and continuity record.
4. Production Workforce V2 code in `web/` is referenced for future integration, but must not silently replace the prototype design process.

## Latest UI decision

### Header notifications

- Keep the notification bell in the Header.
- The Header bell is the single visible entry point to the Notification screen.

### Sidebar notifications

- Remove `🔔 Thông báo` from the Employee sidebar.
- Keep the Notification view itself available for the Header bell.
- Do not duplicate the same navigation destination in both Sidebar and Header.

## Prototype working rule

For every subsequent Employee prototype request:

1. Apply the requested UI/UX change to the current prototype baseline.
2. Preserve all previously approved decisions unless the new request explicitly changes them.
3. Record the change in this document and `PROJECT_CONTROL/CHANGELOG.md`.
4. Save the updated checkpoint to GitHub so the next session can resume from the repository state.
5. Only move prototype decisions into production `web/` code after the prototype/UI phase is explicitly considered complete.

## Last checkpoint

Date: 2026-08-30

Status: Employee prototype in active design iteration.

Completed decision: remove the duplicated Sidebar `Thông báo` navigation item; retain Header notification bell as the notification entry point.
