# MAGASIN — HPRT TL31E Network / Print Protocol Findings

Updated: 2026-08-28

## Scope

This document records what has been verified from the supplied HPRT TL31E documentation, the supplied Windows utility/driver installers, and public HPRT material. It deliberately separates verified facts from inference.

## 1. Verified from the supplied TL31E guide

The supplied guide documents a LAN workflow:

1. Check the active LAN/Wi-Fi subnet.
2. Run the HPRT printer utility.
3. Add printer `TL31`.
4. Open `Advanced setting...` → `Ethernet setting`.
5. Change DHCP to `Static IP mode`.
6. Configure IP address, subnet mask and default gateway.
7. Press `Set` and restart the printer.

The same guide explicitly describes the section as configuring the IP “để kết nối in LAN từ điện thoại”.

## 2. Verified printer capabilities

HPRT's current TL31E product page lists:

- Standard Ethernet interface.
- USB interface.
- TSPL and ESC/POS command sets.
- Label mode and receipt/ticket mode.
- Windows, macOS and Linux driver support.

The supplied guide also distinguishes:

- `HPRT TL31E_T` / TSPL-style label printing.
- `HPRT TL31E_P` / ESC/POS-style receipt printing.

## 3. Static analysis of the supplied utility

The supplied `HPRTUtilityForPOSSetup V1.2.4.19.exe` is a 32-bit Windows PE executable. Static inspection shows Delphi/Embarcadero-style runtime fingerprints and references to:

- `Winapi.Winsock2`
- `Winapi.IpExport`
- `LoadLibraryA/W`
- `GetProcAddress`
- `CreateFileW` / `ReadFile` / `WriteFile`
- `netapi32.dll` (`NetWkstaGetInfo`, `NetApiBufferFree`)

The executable does **not** expose a direct static `ws2_32.dll` import in its normal import table. This strongly suggests that some network functionality may be loaded dynamically or wrapped by runtime code.

### Important limitation

The binary analysis available in this environment did **not** establish a definitive TL31E TCP/UDP destination port, wire framing, discovery packet format, or vendor-specific configuration protocol. No reliable literal `9100` endpoint was found in the executable strings. Therefore this project must **not** hard-code TCP/9100 as a proven TL31E protocol.

## 4. Protocol decision

For actual printing, the preferred application-layer command sets are:

- **TSPL** for label mode.
- **ESC/POS** for receipt mode.

The transport should remain configurable. The first implementation uses a `raw-tcp` adapter with a configurable port, so a confirmed port can be inserted after a one-time LAN probe against the physical printer.

## 5. Recommended architecture

Do **not** make GitHub Pages open raw TCP sockets to a private IP address. The browser is the wrong execution environment for direct printer transport.

Recommended production topology:

```text
MAGASIN GitHub Pages
        |
        | HTTPS / Supabase Auth
        v
Supabase
  print_jobs
  printers
  print_devices
        |
        | Realtime or outbound HTTPS pull
        v
MAGASIN Print Agent (local PC / mini PC)
        |
        | TCP/IP on local LAN
        v
HPRT TL31E
```

The web application creates a durable print job; the local agent is responsible for local-network delivery and retry. The agent should never be reachable from the public Internet.

## 6. Why this architecture is preferred

- Works with GitHub Pages because the browser does not need private-LAN TCP access.
- Supports multiple stores and multiple printers.
- Allows offline retry at store level.
- Separates business authorization from device transport.
- Supports both TSPL label jobs and ESC/POS receipt jobs.
- Allows future replacement of HPRT hardware without rewriting the frontend.

## 7. State model

Suggested print job states:

`QUEUED → CLAIMED → PRINTING → PRINTED`

Failure path:

`PRINTING → FAILED → RETRY_WAIT → CLAIMED`

A job must have an idempotency key so a network reconnect cannot silently print the same receipt twice.

## 8. Security model

The browser should only be allowed to create/read its own authorized print jobs.

The Print Agent should authenticate as a registered device with a scoped credential. A Supabase service-role key must never be shipped to the browser or committed to this repository.

The agent listens on `127.0.0.1` only for local diagnostics. Printer IPs are contacted outbound from the store LAN.

## 9. Next hardware validation step

Before enabling production printing, connect one TL31E to the same LAN as a Windows test PC and record:

- printer IP
- subnet mask
- gateway
- firmware/version if available
- which TCP ports accept a connection
- whether a known TSPL payload prints in Label mode
- whether a minimal ESC/POS payload prints in Receipt mode

The repository now contains a non-destructive PowerShell probe and a configurable Print Agent prototype for that validation.