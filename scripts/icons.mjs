// Genera los iconos PNG de la PWA sin dependencias: fondo oscuro + tres barras ascendentes
// (basket naranja, gimnasio violeta, carrera menta).
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [10, 10, 12]
const BARS = [
  { c: [255, 122, 47], x: 0.25, h: 0.3 },
  { c: [140, 123, 255], x: 0.435, h: 0.45 },
  { c: [62, 224, 161], x: 0.62, h: 0.6 },
]
const W_BAR = 0.13
const BASE = 0.76

function inRoundRect(px, py, x, y, w, h, r) {
  const cx = Math.max(x + r, Math.min(px, x + w - r))
  const cy = Math.max(y + r, Math.min(py, y + h - r))
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r
}

function render(size) {
  const ss = 4
  const px = Buffer.alloc(size * size * 3)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const acc = [0, 0, 0]
      for (let sj = 0; sj < ss; sj++) {
        for (let si = 0; si < ss; si++) {
          const u = (i + (si + 0.5) / ss) / size
          const v = (j + (sj + 0.5) / ss) / size
          let col = BG
          for (const b of BARS) if (inRoundRect(u, v, b.x, BASE - b.h, W_BAR, b.h, W_BAR / 2)) col = b.c
          acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2]
        }
      }
      const o = (j * size + i) * 3
      for (let k = 0; k < 3; k++) px[o + k] = Math.round(acc[k] / (ss * ss))
    }
  }
  return png(size, px)
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
const crc32 = (buf) => {
  let c = -1
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, rgb) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), render(size))
}

const bars = BARS.map((b) => `<rect x="${b.x * 64}" y="${(BASE - b.h) * 64}" width="${W_BAR * 64}" height="${b.h * 64}" rx="${(W_BAR * 64) / 2}" fill="rgb(${b.c})"/>`).join('')
writeFileSync(new URL('../public/favicon.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0A0A0C"/>${bars}</svg>`)
console.log('iconos listos')
