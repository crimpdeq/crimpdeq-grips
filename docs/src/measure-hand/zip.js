// ZIP archive (PKWARE APPNOTE 6.3): each file deflated after its local header, then the central
// directory and its end record.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});

function crc32(bytes) {
  let c = ~0;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

// Little-endian [value, size in bytes] fields.
function fields(...list) {
  const out = new DataView(new ArrayBuffer(list.reduce((n, [, size]) => n + size, 0)));
  let at = 0;
  for (const [value, size] of list) {
    if (size === 2) out.setUint16(at, value, true);
    else out.setUint32(at, value, true);
    at += size;
  }
  return new Uint8Array(out.buffer);
}

// files: [[path, bytes]] -> zip Blob; rejects with signal's reason when it aborts.
export async function zip(files, signal) {
  const now = new Date();
  const time = now.getHours() << 11 | now.getMinutes() << 5 | now.getSeconds() >> 1;
  const date = (now.getFullYear() - 1980) << 9 | (now.getMonth() + 1) << 5 | now.getDate();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const [path, bytes] of files) {
    signal.throwIfAborted();
    const name = new TextEncoder().encode(path);
    const packed = new Uint8Array(await new Response(
      new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    // version 2.0, UTF-8 names, deflate
    const common = [[20, 2], [0x800, 2], [8, 2], [time, 2], [date, 2], [crc32(bytes), 4], [packed.length, 4],
      [bytes.length, 4], [name.length, 2], [0, 2]];
    const local = fields([0x04034b50, 4], ...common);
    chunks.push(local, name, packed);
    central.push(fields([0x02014b50, 4], [20, 2], ...common, [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4]), name);
    offset += local.length + name.length + packed.length;
  }
  const size = central.reduce((n, chunk) => n + chunk.length, 0);
  const end = fields([0x06054b50, 4], [0, 2], [0, 2], [files.length, 2], [files.length, 2], [size, 4], [offset, 4], [0, 2]);
  return new Blob([...chunks, ...central, end], { type: 'application/zip' });
}
