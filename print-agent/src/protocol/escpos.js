function text(value = '') {
  return Buffer.from(String(value), 'utf8');
}

function buildTestReceipt({ title = 'MAGASIN', lines = [] } = {}) {
  const chunks = [];
  // ESC a 1 = center
  chunks.push(Buffer.from([0x1b, 0x61, 0x01]));
  // ESC E 1 = bold on
  chunks.push(Buffer.from([0x1b, 0x45, 0x01]));
  chunks.push(text(`${title}\n`));
  chunks.push(Buffer.from([0x1b, 0x45, 0x00]));
  chunks.push(Buffer.from([0x1b, 0x61, 0x00]));
  for (const line of lines) chunks.push(text(`${line}\n`));
  // Feed a few lines. Cutter command is intentionally omitted because TL31E
  // support can vary by firmware/mode and must be confirmed on the physical unit.
  chunks.push(Buffer.from([0x1b, 0x64, 0x03]));
  return Buffer.concat(chunks);
}

module.exports = { buildTestReceipt };
