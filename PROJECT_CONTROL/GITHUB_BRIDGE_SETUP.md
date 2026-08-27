# MAGASIN GitHub Frontend ↔ Apps Script Bridge Setup

## Why direct fetch failed
The GitHub Pages browser cannot reliably read the Apps Script ContentService response from a cross-origin `fetch()` because the browser enforces CORS. The frontend therefore uses an HTML Service iframe bridge instead.

## Files from this change
- `bridge/Bridge.html` → copy into the Apps Script project as `Bridge.html`.
- `backend/17_GitHub_Bridge.gs` → add as a new Apps Script `.gs` file.
- `backend/15_Ứng_dụng_web.gs` → replace the canonical Apps Script file so `?bridge=1` serves `Bridge.html` with `ALLOWALL`.
- `web/api.js` → already updated on GitHub to use postMessage instead of fetch.
- `web/api-config.js` → already contains the supplied Web App URL.

## Apps Script steps
1. Open the MAGASIN Apps Script project that owns the supplied `/exec` URL.
2. Add HTML file `Bridge.html` using the exact content from `bridge/Bridge.html`.
3. Add script file `17_GitHub_Bridge.gs` using the exact content from `backend/17_GitHub_Bridge.gs`.
4. Replace `15_Ứng_dụng_web.gs` with the canonical version from `backend/15_Ứng_dụng_web.gs`.
5. Save the whole Apps Script project.
6. Deploy a NEW version of the existing Web App. Execute as owner; access must allow the GitHub Pages visitor population to load the bridge.
7. Keep the same Web App `/exec` URL when possible. If Apps Script produces a new deployment URL, update `web/api-config.js` accordingly.

## Test
Open:
`https://magasincoffee.github.io/noibo/web/api-test.html`

The test should return an object containing:
- `ok: true`
- `message: "MAGASIN API đang hoạt động."`
- `transport: "HTML Service + postMessage"`

## Security
The bridge accepts messages only from `https://magasincoffee.github.io`. Do not put passwords, API keys, OAuth secrets or tokens into GitHub.
