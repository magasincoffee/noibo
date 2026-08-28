const net = require('node:net');

function validateHost(host) {
  if (typeof host !== 'string' || host.length < 1 || host.length > 253) {
    throw new Error('Invalid printer host');
  }
  // Allow IPv4/IPv6/hostname here; do not attempt DNS from the frontend.
  if(/[\r\n]/.test(host)) throw new Error('Invalid printer host');
}

function validatePort(port) {
  const n = Number(port);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error('Invalid printer port');
  }
  return n;
}

function sendRawTcp({ host, port, data, timeoutMs = 5000 }) {
  validateHost(host);
  const targetPort = validatePort(port);
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error('Print payload must be a non-empty Buffer');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const socket = net.createConnection({ host, port: targetPort });

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch (_) { /* best effort */ }
      fn(value);
    };

    socket.setTimeout(timeoutMs, () => {
      finish(reject, new Error(`Printer connection timeout after ${timeoutMs}ms`));
    });

    socket.on('connect', () => {
      socket.write(data, () => {
        finish(resolve, {
          ok: true,
          bytesSent: data.length,
          host,
          port: targetPort,
        });
      });
    });

    socket.on('error', (err) => {
      finish(reject, new Error(`Printer connection failed: ${err.message}`));
    });

    socket.on('close', () => {
      // A clean close after write is handled by the write callback.
    });
  });
}

module.exports = { sendRawTcp };
