// ============================================================================
// Genera cliente/public/og-image.png (1200x630) sin dependencias externas.
// Diseño: fondo azul noche + estrella solitaria chilena + paleta de colores
// (identidad de juego de dibujo) + barra roja. Codifica el PNG con zlib.
//   Ejecutar:  node scripts/generar-og.cjs
// ============================================================================

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 1200;
const H = 630;
const buf = Buffer.alloc(W * H * 3);

function set(x, y, r, g, b) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
}
function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// --- fondo: gradiente vertical (#15406f -> #0a2342) ---
const top = [0x15, 0x40, 0x6f];
const bot = [0x0a, 0x23, 0x42];
for (let y = 0; y < H; y++) {
  const t = y / (H - 1);
  const r = lerp(top[0], bot[0], t);
  const g = lerp(top[1], bot[1], t);
  const b = lerp(top[2], bot[2], t);
  for (let x = 0; x < W; x++) set(x, y, r, g, b);
}

function fillCircle(cx, cy, rad, r, g, b) {
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
    for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rad * rad) set(x, y, r, g, b);
    }
  }
}

function roundedBar(x0, y0, x1, y1, r, g, b) {
  const rad = (y1 - y0) / 2;
  for (let x = x0 + rad; x <= x1 - rad; x++) {
    for (let y = y0; y <= y1; y++) set(x, y, r, g, b);
  }
  fillCircle(x0 + rad, y0 + rad, rad, r, g, b);
  fillCircle(x1 - rad, y0 + rad, rad, r, g, b);
}

// estrella de 5 puntas (point-in-polygon)
function estrella(cx, cy, outer, r, g, b) {
  const inner = outer * 0.4;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? outer : inner;
    pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]);
  }
  function dentro(px, py) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0],
        yi = pts[i][1],
        xj = pts[j][0],
        yj = pts[j][1];
      if (
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
      )
        c = !c;
    }
    return c;
  }
  for (let y = Math.floor(cy - outer); y <= cy + outer; y++) {
    for (let x = Math.floor(cx - outer); x <= cx + outer; x++) {
      if (dentro(x + 0.5, y + 0.5)) set(x, y, r, g, b);
    }
  }
}

// --- composicion ---
// estrella solitaria
estrella(600, 250, 170, 0xff, 0xff, 0xff);

// paleta de colores del juego (fila de puntos)
const paleta = [
  [0xe5, 0x39, 0x35],
  [0xfb, 0x8c, 0x00],
  [0xfd, 0xd8, 0x35],
  [0x43, 0xa0, 0x47],
  [0x1e, 0x88, 0xe5],
  [0x8e, 0x24, 0xaa],
  [0x6d, 0x4c, 0x41],
  [0xff, 0x80, 0xab],
];
const n = paleta.length;
const gap = 96;
const x0 = 600 - ((n - 1) * gap) / 2;
for (let i = 0; i < n; i++) {
  const [r, g, b] = paleta[i];
  fillCircle(x0 + i * gap, 470, 30, r, g, b);
  fillCircle(x0 + i * gap, 470, 30 - 6, 0xff, 0xff, 0xff); // borde
  fillCircle(x0 + i * gap, 470, 30 - 8, r, g, b);
}

// barra roja inferior (identidad bandera)
roundedBar(360, 545, 840, 575, 0xd5, 0x2b, 0x1e);

// ---------------------------------------------------------------- PNG encode
function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) {
    c ^= b[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(tipo, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tip = Buffer.from(tipo, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tip, data])), 0);
  return Buffer.concat([len, tip, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

// scanlines con byte de filtro 0
const raw = Buffer.alloc(H * (W * 3 + 1));
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  buf.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}
const idat = zlib.deflateSync(raw, { level: 9 });

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const salida = path.join(__dirname, "..", "cliente", "public", "og-image.png");
fs.writeFileSync(salida, png);
console.log(`og-image.png generado (${png.length} bytes) en ${salida}`);
