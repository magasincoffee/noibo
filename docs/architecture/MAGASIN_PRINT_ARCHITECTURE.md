# MAGASIN — Print Architecture

## Objective

Allow users to press **In** inside the MAGASIN web application and have a physical HPRT TL31E print without opening the operating-system print dialog.

## Target architecture

```text
                     INTERNET
                        |
                 GitHub Pages Web
                        |
                  Supabase Auth
                        |
                 PostgreSQL / RLS
                        |
                durable print_jobs
                        |
          Realtime / HTTPS outbound pull
                        |
                MAGASIN Print Agent
                 (store network)
                        |
                 Raw TCP adapter
                        |
                  HPRT TL31E
```

## Responsibilities

### Web frontend

Creates a print job only after application authorization succeeds. It never opens a raw TCP connection to the private printer IP.

### Supabase

Stores printer registry and durable print jobs. RLS limits jobs to the user's authorized scope. A database record is the source of truth for whether the job was queued, claimed, printed or failed.

### Print Agent

Runs on a Windows PC or small always-on computer inside the store LAN. It makes outbound HTTPS connections to Supabase and outbound TCP connections to local printers. It exposes only a localhost diagnostics API.

### Printer adapter

Converts a logical print payload into printer-native commands. The first adapter targets raw TCP transport. The command language is selected by job mode:

- `TSPL` → label mode.
- `ESC/POS` → receipt mode.

The TCP port is configuration, not a hard-coded product fact.

## Why not browser → printer

A GitHub Pages browser application cannot be treated as a reliable raw TCP client for a private `192.168.x.x` printer. HTTPS pages, browser security boundaries, LAN topology and CORS/mixed-content concerns make direct printer transport brittle.

The local agent removes these constraints while keeping the public application unchanged.

## Print job contract

A future production job should contain at least:

```json
{
  "id": "uuid",
  "store_id": "uuid",
  "printer_id": "uuid",
  "mode": "LABEL",
  "language": "TSPL",
  "template": "product_label_v1",
  "copies": 1,
  "payload": {},
  "idempotency_key": "uuid",
  "status": "QUEUED"
}
```

## State machine

```text
QUEUED
  ↓
CLAIMED
  ↓
PRINTING
  ↓
PRINTED
```

Error path:

```text
PRINTING → FAILED → RETRY_WAIT → CLAIMED
```

A job is considered complete only after the agent has successfully transferred the complete payload to the printer. Device-level “paper finished” or cover-open status should be added later if the TL31E status protocol is confirmed.

## Multiple stores

The printer registry should map:

```text
store → print_device → printer
```

Example:

```text
CuaHang01
  └─ print-device-01
       ├─ TL31E-Label
       └─ TL31E-Receipt

CuaHang02
  └─ print-device-02
       └─ TL31E-01
```

## Reliability rules

1. Do not print directly from a click handler without a durable job ID.
2. Use an idempotency key to avoid duplicate printing after reconnects.
3. Claim jobs before printing so two agents cannot print the same job.
4. Keep retry count and last error.
5. Never retry blindly when the printer may have already received the full payload; the adapter should eventually support device acknowledgements or a store-level operator confirmation policy.

## Security rules

- Never ship a Supabase service-role key in the frontend.
- Do not expose the Print Agent on `0.0.0.0`.
- Prefer a dedicated scoped device credential for the agent.
- Store printer IPs in the printer registry rather than hard-coding them in frontend code.
- Keep all printer traffic inside the store LAN.

## Rollout plan

### Phase 1 — laboratory

Configure one TL31E with static IP and test the physical port/protocol.

### Phase 2 — agent

Install the Print Agent on one Windows machine and validate TSPL + ESC/POS.

### Phase 3 — Supabase queue

Add production `printers`, `print_devices` and `print_jobs` tables/RLS through a controlled migration.

### Phase 4 — frontend

Replace the placeholder print action with `create print job` and a job-status view.

### Phase 5 — multi-store

Register one agent per store and assign printer routes by store/role.

## Important current limitation

The supplied TL31E utility and guide prove Ethernet/LAN configuration and the printer command languages, but do not prove the exact raw TCP port or vendor-specific network framing. Production networking must therefore remain disabled until the physical-printer probe is completed.