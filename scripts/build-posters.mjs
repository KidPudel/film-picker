// Turns the source images in movies-data/ into web-ready assets:
//   public/posters/<id>-360.webp, <id>-720.webp           (poster srcset)
//   public/stills/<id>-<n>-640.webp, -1280.webp           (film-page screen srcset)
//   public/beam/<id>-<n>.webp, <id>-poster.webp           (tiny blurred frames the projector shines through haze)
//   src/data/media.generated.json                         (lqip, mean colour, beam palette, still list)
// Re-run with `npm run media` whenever posters or stills change.
import sharp from 'sharp';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const POSTERS = 'movies-data/posters';
const STILLS = 'movies-data/stills';
const META = 'src/data/media.generated.json';
await Promise.all(['public/posters', 'public/stills', 'public/beam'].map((d) => mkdir(d, { recursive: true })));

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

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
  const S = Math.min(1, s * 1.3 + 0.06);
  const L = Math.min(0.84, Math.max(0.6, l * 0.55 + 0.45));
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
  const p = 2 * L - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return hex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}

async function describe(input) {
  // Beam palette: the image's 16 column colours, lifted to "light".
  const cols = await input.clone().resize(16, 1, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const palette = Array.from({ length: 16 }, (_, i) => toLight(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]));
  const { channels } = await input.clone().stats();
  const mean = hex(channels[0].mean, channels[1].mean, channels[2].mean);
  const lqip = await input.clone().resize({ width: 16 }).blur(0.6).webp({ quality: 40 }).toBuffer();
  return { palette, mean, lqip: `data:image/webp;base64,${lqip.toString('base64')}` };
}

// The haze is soft, so the projector only needs a small, slightly blurred frame.
const beam = (input, out) => input.clone().resize({ width: 192, height: 108, fit: 'cover' }).blur(0.8).webp({ quality: 70 }).toFile(out);

const meta = {};

for (const file of (await readdir(POSTERS)).filter((f) => f.endsWith('.jpg'))) {
  const id = path.basename(file, '.jpg');
  const input = sharp(path.join(POSTERS, file));
  for (const w of [360, 720]) await input.clone().resize({ width: w }).webp({ quality: 80 }).toFile(`public/posters/${id}-${w}.webp`);
  await beam(input, `public/beam/${id}-poster.webp`);
  meta[id] = { poster: await describe(input), stills: [] };
}

const manifest = JSON.parse(await readFile('movies-data/stills.json', 'utf8'));
for (const [id, list] of Object.entries(manifest.films)) {
  for (const [i, s] of list.entries()) {
    const n = i + 1;
    const input = sharp(path.join(STILLS, s.file));
    const { width, height } = await input.metadata();
    for (const w of [640, 1280]) await input.clone().resize({ width: w }).webp({ quality: 78 }).toFile(`public/stills/${id}-${n}-${w}.webp`);
    await beam(input, `public/beam/${id}-${n}.webp`);
    const d = await describe(input);
    meta[id].stills.push({ n, w: width, h: height, mean: d.mean, palette: d.palette, lqip: d.lqip, source: s.page });
  }
}

await writeFile(META, JSON.stringify(meta, null, 2) + '\n');
console.log(`media: ${Object.keys(meta).length} films, ${Object.values(meta).reduce((n, m) => n + m.stills.length, 0)} stills`);
