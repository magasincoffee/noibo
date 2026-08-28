# MAGASIN Print Agent — TL31E prototype

## Purpose

This folder contains the first implementation of a local print agent for HPRT TL31E network printing.

It is intentionally a **prototype / validation layer**. It does not modify Supabase production and does not contain any credentials.

## Requirements

- Windows 10/11 or another OS with Node.js 20+ for the agent host.
- One HPRT TL31E connected to the same LAN as the agent host.
- TL31E configured with a reachable static IP or DHCP reservation.

## Start

```powershell
cd print-agent
$env:AGENT_HOST='127.0.0.1'
$env:AGENT_PORT='9110'
$env:PRINTER_HOST='192.168.1.250'
$env:PRINTER_PORT='9100'
node src/server.js
```

The example printer port `9100` is only a placeholder. Confirm the actual port on the physical unit before using it.

## Validate the physical port without printing

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Probe-TL31EPorts.ps1 -PrinterIP 192.168.1.250
```

This only attempts TCP connections to the specified ports. It never sends printer commands.

## Test the local agent

```powershell
Invoke-RestMethod http://127.0.0.1:9110/health
```

## Test a label

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:9110/v1/print/label-test `
  -ContentType 'application/json' `
  -Body '{"widthMm":72,"heightMm":22,"text":"MAGASIN TEST","barcode":"TEST001"}'
```

## Test a receipt

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:9110/v1/print/receipt-test `
  -ContentType 'application/json' `
  -Body '{"title":"MAGASIN TEST","lines":["Receipt mode","LAN validation"]}'
```

## Important protocol note

HPRT's product information confirms Ethernet, TSPL and ESC/POS for TL31E. The supplied HPRT utility confirms Ethernet configuration. Static inspection of the supplied utility also shows Winsock/IP-related runtime references.

The supplied material does **not** establish the exact TL31E raw TCP port or a vendor-specific discovery/status protocol. Do not treat `9100` in the example configuration as confirmed.

## Production path

The prototype should evolve into:

1. Supabase `printers` + `print_devices` + `print_jobs`.
2. One scoped device identity per store Print Agent.
3. Agent pulls/receives jobs over outbound HTTPS or Supabase Realtime.
4. Agent validates job and renders TSPL/ESC/POS.
5. Agent delivers over the confirmed local printer transport.
6. Agent reports durable state and last error.

The browser must never contain a Supabase service-role key and must never expose the Print Agent publicly.
