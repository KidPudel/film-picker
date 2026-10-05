import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

// Bake the former projector seat geometry once, rather than shading it on every frame.
// Two front seats form a seamless repeat, with three smaller seats in the rear row.
const height = 240;
const width = Math.round(height * 1.48 * 2);
const pixels = new Uint8Array(width * height * 4);
const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const smooth = (lo, hi, n) => { const t = clamp((n - lo) / (hi - lo)); return t * t * (3 - 2 * t); };
const normalize = (v) => { const m = Math.hypot(...v); return v.map((n) => n / m); };
const light = normalize([0, 0.78, 0.62]);
const sheen = [0.72, 0.82, 0.88];

function seatHeight(x, y, w) {
  const u = clamp(x / (w * 0.5), -1, 1);
  const v = y / w;
  const roll = v < 0.2 ? Math.sqrt(Math.max(0, 1 - ((v - 0.1) / 0.1) ** 2)) : 0;
  const seam = Math.exp(-(((v - 0.205) / 0.016) ** 2));
  const pleat = Math.exp(-(((Math.abs(u) - 0.36) / 0.04) ** 2)) * smooth(0.21, 0.26, v);
  return 0.6 * Math.sqrt(Math.max(0, 1 - u * u)) + 0.5 * roll - 0.5 * seam - 0.25 * pleat;
}

function seatRow(px, py, top, w, spacing, shift, lit) {
  const cell = Math.floor((px - shift) / spacing + 0.5);
  const x = px - shift - cell * spacing;
  let y = top - py;
  y += (1 - (x / (w * 0.5)) ** 2) * w * 0.035;
  const r = w * 0.25;
  const sd = Math.abs(x) > w * 0.5 - r && y < r
    ? Math.hypot(Math.abs(x) - (w * 0.5 - r), y - r) - r
    : Math.max(Math.abs(x) - w * 0.5, -y);
  const alpha = smooth(1, -1, sd);
  if (alpha === 0) return [0, 0, 0, 0];
  const sy = top - py;
  const h = seatHeight(x, sy, w);
  const n = normalize([-(seatHeight(x + 1, sy, w) - h) * w * 0.1, (seatHeight(x, sy + 1, w) - h) * w * 0.1, 1]);
  const diffuse = Math.max(0, n[1] * light[1] + n[2] * light[2]);
  const graze = (1 - clamp(n[2])) ** 1.5;
  const fromAbove = Math.exp(-Math.max(sy / w, 0) * 2.4) * lit;
  const specular = Math.max(0, 2 * diffuse * n[2] - light[2]) ** 18;
  const grain = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
  const nap = 0.82 + 0.36 * (grain - Math.floor(grain));
  const edge = smooth(-w * 0.015, -w * 0.09, sd) * 0.45 + 0.55;
  const col = [0.34, 0.035, 0.07].map((velvet, i) =>
    (velvet * (0.07 + 0.95 * diffuse * fromAbove) * nap
      + sheen[i] * graze * fromAbove * 0.42
      + sheen[i] ** 2 * graze * fromAbove * 0.55
      + sheen[i] * specular * fromAbove * 0.35 * nap) * edge,
  );
  return [...col, alpha];
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const py = height - y - 0.5;
    const back = seatRow(x + 0.5, py, height * 0.98, height * 0.92, width / 3, width / 6, 0.5);
    const front = seatRow(x + 0.5, py, height * 0.72, height * 1.42, width / 2, 0, 1);
    const a = front[3] + back[3] * (1 - front[3]);
    const fade = smooth(0, height * 0.42, py);
    const offset = (y * width + x) * 4;
    for (let i = 0; i < 3; i++) pixels[offset + i] = Math.round(clamp(a ? (front[i] * front[3] + back[i] * back[3] * (1 - front[3])) / a : 0) * 255);
    pixels[offset + 3] = Math.round(a * fade * 255);
  }
}

await sharp(pixels, { raw: { width, height, channels: 4 } })
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(fileURLToPath(new URL('../public/cinema-seats.webp', import.meta.url)));
