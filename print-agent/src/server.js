const http = require('node:http');
const { sendRawTcp } = require('./printers/raw-tcp');
const { buildProductLabel } = require('./protocol/tspl');
const { buildTestReceipt } = require('./protocol/escpos');

const HOST = process.env.AGENT_HOST || '127.0.0.1';
const PORT = Number(process.env.AGENT_PORT || 9110);
const DEFAULT_PRINTER_HOST = process.env.PRINTER_HOST || '192.168.1.250';
const DEFAULT_PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100);

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch (_) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, {
        ok: true,
        service: 'magasin-print-agent',
        version: '0.1.0',
      });
    }

    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const body = await readJson(req);
    const host = body.host || DEFAULT_PRINTER_HOST;
    const port = Number(body.port || DEFAULT_PRINTER_PORT);

    if (req.url === '/v1/printer/test-connection') {
      const started = Date.now();
      await sendRawTcp({
        host,
        port,
        data: Buffer.from('\n', 'ascii'),
        timeoutMs: 3000,
      });
      return json(res, 200, {
        ok: true,
        host,
        port,
        latencyMs: Date.now() - started,
      });
    }

    if (req.url === '/v1/print/label-test') {
      const data = buildProductLabel({
        widthMm: body.widthMm || 72,
        heightMm: body.heightMm || 22,
        text: body.text || 'MAGASIN TEST',
        barcode: body.barcode || '',
        qr: body.qr || '',
      });
      const result = await sendRawTcp({ host, port, data });
      return json(res, 200, { ok: true, result });
    }

    if (req.url === '/v1/print/receipt-test') {
      const data = buildTestReceipt({
        title: body.title || 'MAGASIN',
        lines: Array.isArray(body.lines) ? body.lines.slice(0, 30) : ['TEST PRINT'],
      });
      const result = await sendRawTcp({ host, port, data });
      return json(res, 200, { ok: true, result });
    }

    if (req.url === '/v1/print/raw') {
      if (typeof body.dataBase64 !== 'string' || body.dataBase64.length === 0) {
        return json(res, 400, { ok: false, error: 'dataBase64 is required' });
      }
      const data = Buffer.from(body.dataBase64, 'base64');
      if (data.length === 0 || data.length > 1024 * 1024) {
        return json(res, 400, { ok: false, error: 'Invalid payload size' });
      }
      const result = await sendRawTcp({ host, port, data });
      return json(res, 200, { ok: true, result });
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`MAGASIN Print Agent listening on http://${HOST}:${PORT}`);
  console.log(`Default printer: ${DEFAULT_PRINTER_HOST}:${DEFAULT_PRINTER_PORT}`);
  console.log('Network printing is intended for controlled local-LAN validation only.');
});
