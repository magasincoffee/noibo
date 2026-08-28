function esc(value) {
  return String(value ?? '').replace(/"/g, '\\"');
}

function buildProductLabel({ widthMm, heightMm, text = 'MAGASIN', barcode = '', qr = '' }) {
  const width = Number(widthMm);
  const height = Number(heightMm);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Invalid label dimensions');
  }

  // Coordinates are intentionally simple defaults for a lab template.
  // Physical calibration is required before production use.
  const dotsPerMm = 8;
  const widthDots = Math.round(width * dotsPerMm);
  const heightDots = Math.round(height * dotsPerMm);
  const lines = [
    `SIZE ${width} mm,${height} mm`,
    'GAP 2 mm,0 mm',
    'DIRECTION 1',
    'REFERENCE 0,0',
    'CLS',
    `TEXT 16,16,"0",0,1,1,"${esc(text)}"`,
  ];

  if (barcode) {
    lines.push(`BARCODE 16,56,"128",60,1,0,2,2,"${esc(barcode)}"`);
  }

  if (qr) {
    lines.push(`QRCODE 16,${Math.max(120, Math.round(heightDots * 0.55))},L,5,A,0,"${esc(qr)}"`);
  }

  lines.push('PRINT 1,1', '');
  return Buffer.from(lines.join('\r\n'), 'ascii');
}

module.exports = { buildProductLabel };
