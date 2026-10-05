// Turns movies-data/posters/*.jpg into web-ready assets:
//   public/posters/<id>-360.webp, <id>-720.webp  (responsive srcset)
//   src/data/posters.generated.json              (dominant colour + tiny blur placeholder)
// Re-run with `npm run posters` whenever the source posters change.
import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'movies-data/posters';
const OUT = 'public/posters';
const META = 'src/data/posters.generated.json';
await mkdir(OUT, { recursive: true });

const meta = {};

/** rgb → hex with lightness/saturation pushed up so it reads as coloured light. */
function toLight(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  const S = Math.min(1, s * 1.35 + 0.08);
  const L = Math.min(0.82, Math.max(0.58, l * 0.6 + 0.42));
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
  const p = 2 * L - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return '#' + [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
for (const file of (await readdir(SRC)).filter((f) => f.endsWith('.jpg'))) {
  const id = path.basename(file, '.jpg');
  const input = sharp(path.join(SRC, file));
  for (const w of [360, 720]) {
    await input.clone().resize({ width: w }).webp({ quality: 78 }).toFile(path.join(OUT, `${id}-${w}.webp`));
  }
  const { dominant } = await input.clone().stats();
  // Beam palette: the poster's 16 column colours, lifted to "light" — a projector
  // beam carries the image, so the rays take the colours of the film on screen.
  const cols = await input.clone().resize(16, 1, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const palette = [];
  for (let i = 0; i < 16; i++) palette.push(toLight(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]));
  const lqip = await input.clone().resize({ width: 12 }).blur().webp({ quality: 40 }).toBuffer();
  const hex = '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('');
  meta[id] = { dominant: hex, palette, lqip: `data:image/webp;base64,${lqip.toString('base64')}` };
}
await writeFile(META, JSON.stringify(meta, null, 2) + '\n');
console.log(`posters: ${Object.keys(meta).length} processed`);
