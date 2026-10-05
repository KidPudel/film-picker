import { useEffect, useRef } from 'react';
import { HOUSE, useProjector, type Frame } from '../store/useProjector';
import './Projector.css';

/**
 * Real-time projector light (WebGL), one fixed canvas behind the whole app.
 *
 * The camera is the viewer's eyes; the lens sits behind and above the head.
 * Each pixel marches through drifting haze and asks, for every sample, which
 * point of the projected frame lights it — so the shafts are the film's own
 * image travelling through smoke. Near the head the beam is wider than the
 * view, so light wraps in from the top and the sides and converges ahead:
 * on the film page it lands exactly on the screen element.
 *
 * Decorative (aria-hidden). Low resolution + soft haze, ~30 fps when idle,
 * paused in hidden tabs, frozen under reduced motion, off in the light theme,
 * static CSS fallback without WebGL.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const COMMON = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uAspect;
uniform float uFocal;
uniform vec3 uS;
uniform vec2 uRectMin;
uniform vec2 uRectMax;
uniform float uZs;
uniform float uWarp;
uniform float uMix;
uniform float uIntensity;
uniform sampler2D uImgA;
uniform sampler2D uImgB;
uniform sampler2D uNoise;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 frame(vec2 uv) { uv = clamp(uv, 0.0, 1.0); return mix(texture2D(uImgA, uv).rgb, texture2D(uImgB, uv).rgb, uMix); }
// Where a point in the hall sits inside the projected frame (0..1), seen from the lens.
vec2 beamUV(vec3 P) {
  vec3 L = P - uS;
  vec2 Q = uS.xy + L.xy * ((uZs - uS.z) / L.z);
  return (Q - uRectMin) / (uRectMax - uRectMin);
}
float insideBeam(vec2 uv, float soft) {
  vec2 e = min(uv, 1.0 - uv);
  // The lower edge (over the audience) fades softly; the others are the frame's own edges.
  return smoothstep(-soft * 0.4, soft, min(e.x, 1.0 - uv.y)) * smoothstep(-soft, soft * 3.5, uv.y);
}
`;

const BEAM_FRAG = (steps: number) => `${COMMON}
uniform float uFilm;
uniform vec3 uMean;
uniform float uGlow;
uniform vec4 uSeats; // x: band bottom, y: band height (canvas px, from the bottom), z: on
uniform float uAmbient; // how much the hall itself takes on the frame (film vs. house light)
const int N = ${steps};

// ── The row of velvet seats in front of you ──────────────────────────────
// Height field of one seat back: a cushion bulge, a rolled bolster on top,
// a seam under it and two vertical channels (pleats).
float seatHeight(float lx, float y, float w) {
  float u = clamp(lx / (w * 0.5), -1.0, 1.0);
  float v = y / w;
  float bulge = sqrt(max(0.0, 1.0 - u * u));
  float rt = (v - 0.1) / 0.1;
  float roll = v < 0.2 ? sqrt(max(0.0, 1.0 - rt * rt)) : 0.0;
  float seam = exp(-pow((v - 0.205) / 0.016, 2.0));
  float pleat = exp(-pow((abs(u) - 0.36) / 0.04, 2.0)) * smoothstep(0.21, 0.26, v);
  return 0.6 * bulge + 0.5 * roll - 0.5 * seam - 0.25 * pleat;
}
// Signed distance to a seat back: rounded shoulders, slightly domed top, open to the bottom.
float seatSD(float lx, float y, float w) {
  float hw = w * 0.5;
  float r = w * 0.25;
  float u = lx / hw;
  y += (1.0 - u * u) * w * 0.035;
  float ax = abs(lx);
  if (ax > hw - r && y < r) return length(vec2(ax - (hw - r), y - r)) - r;
  return max(ax - hw, -y);
}
vec3 seatRow(vec3 c, vec2 p, float top, float w, float gap, float shift, float lit) {
  float pitch = w + gap;
  float x = p.x - shift;
  float cell = floor(x / pitch + 0.5);
  float lx = x - cell * pitch;
  float y = top - p.y;
  float sd = seatSD(lx, y, w);
  float mask = smoothstep(1.0, -1.0, sd);
  if (mask <= 0.0) return c;
  float h0 = seatHeight(lx, y, w);
  float hx = seatHeight(lx + 1.0, y, w);
  float hy = seatHeight(lx, y + 1.0, w);
  float k = w * 0.1;
  vec3 n = normalize(vec3(-(hx - h0) * k, (hy - h0) * k, 1.0));
  float v = max(y / w, 0.0);
  vec3 L = normalize(vec3(0.0, 0.78, 0.62));
  float diff = max(dot(n, L), 0.0);
  float graze = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.5);   // velvet glows at grazing angles
  float fromAbove = exp(-v * 2.4) * lit;
  vec3 lightCol = mix(uMean, vec3(1.0), 0.3) * (0.4 + 0.6 * uIntensity);
  // The sheen reflects the projected frame: each seat shimmers in the film's colours.
  vec3 rf = reflect(vec3(0.0, 0.0, -1.0), n);
  vec3 refl = frame(vec2(fract(0.5 + rf.x * 0.7 + cell * 0.173), 0.55 + rf.y * 0.45));
  float nap = 0.82 + 0.36 * texture2D(uNoise, p * vec2(0.045, 0.012) + cell * 0.31).b;
  vec3 velvet = vec3(0.34, 0.035, 0.07);
  vec3 col = velvet * (0.07 + 0.95 * diff * fromAbove) * nap;
  col += lightCol * graze * fromAbove * 0.42;
  col += refl * refl * graze * fromAbove * 1.1;
  col += lightCol * pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 18.0) * fromAbove * 0.35 * nap;
  col *= smoothstep(-w * 0.015, -w * 0.09, sd) * 0.45 + 0.55; // contact shadow at the edges
  return mix(c, col, mask);
}

void main() {
  vec2 ndc = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  float focal = uFocal * (1.0 + uWarp * 0.16);
  vec3 d = normalize(vec3(ndc.x * uAspect, ndc.y, focal));
  float camZ = uWarp * 0.8;

  float tNear = 0.22 / d.z;
  float tFar = max(uZs - camZ, 1.0) / d.z;
  float ratio = tFar / tNear;
  // Interleaved gradient noise: an even, fine dither that hides the step count.
  vec2 fc = gl_FragCoord.xy + fract(uTime * 7.31) * 97.0;
  float jitter = fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715))));

  vec3 acc = vec3(0.0);
  float tPrev = tNear;
  for (int i = 0; i < N; i++) {
    float t = tNear * pow(ratio, (float(i) + jitter) / float(N));
    float dt = t - tPrev;
    tPrev = t;
    vec3 P = d * t + vec3(0.0, 0.0, camZ);
    vec2 uv = beamUV(P);
    float inside = insideBeam(uv, 0.03);
    if (inside <= 0.0) continue;

    // Haze: two drifting layers of smoke, sliced through a tiling noise field.
    vec2 p1 = P.xy * 0.31 + vec2(P.z * 0.083, -P.z * 0.047) + vec2(uTime * 0.0105, uTime * 0.0165);
    vec2 p2 = P.xy * 0.92 + vec2(-P.z * 0.161, P.z * 0.107) + vec2(-uTime * 0.0235, uTime * 0.0125);
    float n = texture2D(uNoise, p1).r * 0.6 + texture2D(uNoise, p2).g * 0.4;
    float dens = 0.42 + 1.15 * smoothstep(0.3, 0.9, n);

    // Fine streaks are constant along each ray — the lens grain of the projected image.
    float grain = texture2D(uNoise, uv * vec2(2.7, 0.16) + vec2(0.37, 0.11)).b;
    vec3 img = pow(frame(uv), vec3(1.3)) * (0.22 + 2.2 * grain * grain * grain);

    vec3 L = P - uS;
    float r2 = dot(L, L);
    float irr = 1.0 / (0.55 + r2);

    // Warp: dashes of light rushing along the rays.
    float s = log(r2) * 1.7 - uTime * 7.5;
    float dash = texture2D(uNoise, vec2(uv.x * 4.7 + uv.y * 2.1, s * 0.19)).b;
    float boost = 1.0 + uWarp * (smoothstep(0.5, 0.92, dash) * 9.0 + 0.8);

    acc += img * (irr * dens * inside * dt * boost);
  }
  vec3 beam = 1.0 - exp(-acc * uIntensity * 4.4);
  // Light in haze keeps its colour: lift saturation after the shoulder.
  float luma = dot(beam, vec3(0.2126, 0.7152, 0.0722));
  beam = max(mix(vec3(luma), beam, 1.35), 0.0);

  // On the film page the wall around the screen catches the screen's light.
  if (uFilm > 0.001) {
    vec2 W = d.xy * ((uZs - camZ) / d.z);
    vec2 ctr = (uRectMin + uRectMax) * 0.5;
    vec2 hs = (uRectMax - uRectMin) * 0.5;
    vec2 q = abs(W - ctr) - hs;
    float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    float spill = exp(-max(dist, 0.0) / (hs.x * 0.7)) * step(0.0, dist);
    beam += uMean * spill * 0.11 * uFilm * uIntensity;
  }

  // In the catalog the rays meet far ahead, where the screen would be: a soft glow there.
  if (uGlow > 0.001) {
    vec2 ctr = (uRectMin + uRectMax) * 0.5;
    vec2 vp = vec2(ctr.x * focal / (uAspect * uZs), ctr.y * focal / uZs);
    vec2 gd = (ndc - vp) * vec2(uAspect, 1.6);
    beam += mix(uMean, vec3(1.0), 0.4) * exp(-dot(gd, gd) * 5.0) * 0.07 * uGlow * uIntensity;
  }

  // The hall itself: neutral black, darkest low in the corners.
  vec3 hall = vec3(0.035, 0.035, 0.043);
  float vig = smoothstep(1.6, 0.25, length(vec2(ndc.x * 0.8, (ndc.y + 0.45) * 0.85)));
  vec3 c = hall * mix(0.45, 1.0, vig) + beam * mix(0.7, 1.0, vig);
  // The walls catch the film: a huge, soft spill of the frame that is showing.
  vec3 amb = frame(vec2(ndc.x * 0.5 + 0.5, ndc.y * 0.32 + 0.6));
  float ambW = smoothstep(1.5, 0.0, length(vec2(ndc.x * 0.75, (ndc.y - 0.3) * 1.15)));
  c += amb * amb * ambW * 0.11 * uAmbient * uIntensity;

  if (uSeats.z > 0.5) {
    vec2 p = gl_FragCoord.xy;
    float bb = uSeats.x;
    float bh = uSeats.y;
    float cx = uRes.x * 0.5;
    float wf = bh * 0.92;
    c = seatRow(c, p, bb + bh * 0.98, wf, bh * 0.05, cx + (wf + bh * 0.05) * 0.5, 0.5);
    float wn = bh * 1.42;
    c = seatRow(c, p, bb + bh * 0.72, wn, bh * 0.06, cx, 1.0);
    // The seats sink into the dark below them.
    c = mix(c, hall * 0.45, smoothstep(bb + bh * 0.42, bb - bh * 0.02, p.y) * step(p.y, bb + bh));
  }

  c += (hash(gl_FragCoord.xy + fract(uTime * 0.71) * 113.0) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}
`;

// Dust motes drifting through the light: big and soft near the eye, pin-sharp far away.
const DUST_VERT = `
attribute vec4 aP;
uniform float uTime;
uniform float uAspect;
uniform float uFocal;
uniform float uWarp;
uniform vec2 uRes;
uniform vec3 uS;
uniform vec2 uRectMin;
uniform vec2 uRectMax;
uniform float uZs;
varying vec2 vUV;
varying float vNear;
varying float vTw;
void main() {
  float s = aP.w;
  vec3 P = aP.xyz;
  P.x += sin(uTime * 0.07 + s * 20.0) * 0.22;
  P.y += sin(uTime * 0.05 + s * 13.0) * 0.16 - uTime * 0.006 * (0.4 + fract(s * 7.0));
  P.y = mod(P.y + 1.6, 4.4) - 1.6;
  P.z += cos(uTime * 0.06 + s * 31.0) * 0.25;
  float camZ = uWarp * 0.8;
  float z = P.z - camZ;
  float focal = uFocal * (1.0 + uWarp * 0.16);
  if (z < 0.18) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 0.0; return; }
  gl_Position = vec4(P.x * focal / (uAspect * z), P.y * focal / z, 0.0, 1.0);
  gl_PointSize = clamp(uRes.y * 0.013 / z * (0.5 + fract(s * 3.1)), 1.2, 72.0);
  vec3 L = P - uS;
  vec2 Q = uS.xy + L.xy * ((uZs - uS.z) / L.z);
  vUV = (Q - uRectMin) / (uRectMax - uRectMin);
  vNear = clamp(1.0 / (0.6 + dot(L, L)), 0.0, 1.0);
  vTw = 0.55 + 0.45 * sin(uTime * (0.6 + fract(s * 5.0) * 1.7) + s * 40.0);
}
`;

const DUST_FRAG = `${COMMON}
varying vec2 vUV;
varying float vNear;
varying float vTw;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.55, r) * 0.55 + smoothstep(1.0, 0.85, r) * smoothstep(0.7, 0.95, r) * 0.35;
  float a = disc * insideBeam(vUV, 0.05) * vNear * vTw;
  gl_FragColor = vec4(mix(frame(vUV), vec3(1.0), 0.35) * a * uIntensity * 3.2, 1.0);
}
`;

// ─── Textures ─────────────────────────────────────────────────────────────

/** Tiling noise: R/G = domain-warped smoke at two scales, B = fine grain. */
function makeNoise(size = 256): Uint8Array {
  const rnd = (seed: number) => {
    const g = new Float32Array(size * size);
    let x = seed;
    for (let i = 0; i < g.length; i++) {
      x = (x * 1664525 + 1013904223) >>> 0;
      g[i] = x / 4294967296;
    }
    return g;
  };
  const value = (g: Float32Array, cells: number, u: number, v: number) => {
    const fx = u * cells, fy = v * cells;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const at = (x: number, y: number) => g[((y % cells) + cells) % cells * size + (((x % cells) + cells) % cells)];
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const fbm = (g: Float32Array, u: number, v: number, base: number, oct: number) => {
    let s = 0, amp = 0.5, cells = base, norm = 0;
    for (let o = 0; o < oct; o++) {
      s += amp * value(g, cells, u, v);
      norm += amp;
      amp *= 0.5;
      cells *= 2;
    }
    return s / norm;
  };
  const g1 = rnd(7), g2 = rnd(1931), g3 = rnd(4242);
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const w1 = fbm(g2, u, v, 4, 3), w2 = fbm(g3, u + 0.31, v + 0.67, 4, 3);
      const r = fbm(g1, u + w1 * 0.35, v + w2 * 0.35, 4, 5);
      const gg = fbm(g2, u + w2 * 0.25, v - w1 * 0.25, 8, 4);
      const b = fbm(g3, u, v, 32, 3);
      const i = (y * size + x) * 4;
      out[i] = Math.min(255, Math.max(0, (r - 0.5) * 2.2 * 128 + 128));
      out[i + 1] = Math.min(255, Math.max(0, (gg - 0.5) * 2.2 * 128 + 128));
      out[i + 2] = Math.min(255, Math.max(0, (b - 0.5) * 2.6 * 128 + 128));
      out[i + 3] = 255;
    }
  }
  return out;
}

/** The house reel: cyan, teal and white streaks, like the light of an empty projector. */
function makeHouseFrame(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#05080e';
  g.fillRect(0, 0, 512, 64);
  const hues = ['#5ccbdc', '#a6ecff', '#ffffff', '#4aaec4', '#d0f4ff', '#7c9fff', '#f2fcff', '#4fd2c8', '#ffffff', '#8ad9f5', '#c2d4ff', '#e4f8ff'];
  let x = 0, i = 0, seed = 11;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  while (x < 512) {
    const w = 1 + r() * 14;
    const a = 0.45 + r() * 0.55;
    g.globalAlpha = r() < 0.22 ? a * 0.18 : a;
    g.fillStyle = hues[i++ % hues.length];
    g.fillRect(x, 0, w, 64);
    x += w;
  }
  g.globalAlpha = 1;
  const v = g.createLinearGradient(0, 0, 0, 64);
  v.addColorStop(0, 'rgba(0,0,0,0.35)');
  v.addColorStop(0.45, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = v;
  g.fillRect(0, 0, 512, 64);
  return c;
}

const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

/** Lift a frame's mean colour toward "light" so it reads as a glow, not mud. */
function lift([r, g, b]: [number, number, number]): [number, number, number] {
  const m = Math.max(r, g, b, 1e-3);
  const k = 0.82 / m;
  return [Math.min(1, r * k * 0.8 + 0.12), Math.min(1, g * k * 0.8 + 0.12), Math.min(1, b * k * 0.8 + 0.14)];
}

// ─── Component ────────────────────────────────────────────────────────────

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
  return sh;
}
function program(gl: WebGLRenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

const CATALOG = { s: [0, 0.62, -1.0], zs: 26, min: [-22, -4.2], max: [22, 13] };
const FOCAL = 1.55;

export function Projector() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const root = document.documentElement;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) {
      root.classList.add('no-webgl');
      return;
    }
    const phone = Math.min(window.innerWidth, window.innerHeight) < 600;

    let beamProg: WebGLProgram, dustProg: WebGLProgram;
    try {
      beamProg = program(gl, VERT, BEAM_FRAG(phone ? 14 : 22));
      dustProg = program(gl, DUST_VERT, DUST_FRAG);
    } catch (e) {
      console.warn('Projector disabled:', e);
      root.classList.add('no-webgl');
      return;
    }

    // Geometry: a full-screen triangle, and the dust motes.
    const tri = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const MOTES = phone ? 110 : 200;
    const motes = new Float32Array(MOTES * 4);
    let seed = 3;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < MOTES; i++) {
      const z = 0.35 + Math.pow(r(), 1.6) * 8;
      motes.set([(r() * 2 - 1) * (0.6 + z * 0.75), r() * 4.4 - 1.6, z, r()], i * 4);
    }
    const dustBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
    gl.bufferData(gl.ARRAY_BUFFER, motes, gl.STATIC_DRAW);

    const tex = (repeat: boolean) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      return t;
    };
    const noiseTex = tex(true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, makeNoise());
    const texA = tex(false);
    const texB = tex(false);
    const house = makeHouseFrame();
    for (const t of [texA, texB]) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, house);
    }

    const uniforms = (p: WebGLProgram) => {
      const names = ['uRes', 'uTime', 'uAspect', 'uFocal', 'uS', 'uRectMin', 'uRectMax', 'uZs', 'uWarp', 'uMix', 'uIntensity', 'uImgA', 'uImgB', 'uNoise', 'uFilm', 'uMean', 'uGlow', 'uSeats', 'uAmbient'];
      return Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)])) as Record<string, WebGLUniformLocation | null>;
    };
    const UB = uniforms(beamProg);
    const UD = uniforms(dustProg);
    const aPos = gl.getAttribLocation(beamProg, 'aPos');
    const aP = gl.getAttribLocation(dustProg, 'aP');

    // ── Frames: the light is made of whatever is on (or would be on) the screen.
    const cache = new Map<string, TexImageSource>([['', house]]);
    const pending = new Set<string>();
    const load = (url: string, then: () => void) => {
      if (cache.has(url)) return then();
      if (pending.has(url)) return;
      pending.add(url);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        pending.delete(url);
        cache.set(url, img);
        then();
      };
      img.onerror = () => pending.delete(url);
      img.src = url;
    };
    let shownKey = '';
    let mix = 1;
    let wantKey = '';
    const upload = (t: WebGLTexture, key: string) => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cache.get(key)!);
    };
    const begin = (key: string) => {
      if (key === shownKey) return;
      // Keep whichever texture dominates the current blend as the starting point.
      if (mix >= 0.5) upload(texA, shownKey);
      upload(texB, key);
      shownKey = key;
      mix = 0;
    };

    const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'reduce';

    let w = 0, h = 0, scale = phone ? 0.4 : 0.5;
    const resize = () => {
      const px = Math.min(1, Math.sqrt(640_000 / (window.innerWidth * window.innerHeight * scale * scale)));
      w = Math.max(2, Math.round(window.innerWidth * scale * px));
      h = Math.max(2, Math.round(window.innerHeight * scale * px));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    // Eased scene state.
    const cur = {
      s: [...CATALOG.s], zs: CATALOG.zs, min: [...CATALOG.min], max: [...CATALOG.max],
      film: 0, intensity: 0, ambient: 0.3, mean: lift(hexRgb(HOUSE.mean)),
    };
    let lastBeamVar = '';
    let lastVarAt = 0;
    let raf = 0;
    let last = performance.now();
    const t0 = last;
    let odd = false;
    let lastScroll = -1;
    let activeUntil = 0;

    let lastDrawn = false;
    const frame = (now: number, force = false) => {
      if (!force) raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      if (root.dataset.theme === 'light' || (!force && document.visibilityState !== 'visible')) {
        last = now;
        return;
      }
      const st = useProjector.getState();
      const rm = reduce();

      // Which frame should the light carry?
      const target: Frame = st.preview ?? st.frame;
      if (target.image !== wantKey) {
        wantKey = target.image;
        load(wantKey, () => wantKey === target.image && begin(wantKey));
      }

      const scroll = window.scrollY;
      if (scroll !== lastScroll) {
        lastScroll = scroll;
        activeUntil = now + 400;
      }
      const warpE = (now - st.warpAt) / 1000;
      const warp = rm || warpE < 0 || warpE > 1.5 ? 0 : warpE < 0.18 ? warpE / 0.18 : Math.exp(-(warpE - 0.18) * 3.1);
      const fading = mix < 1;
      const busy = warp > 0.001 || fading || now < activeUntil;
      // Idle haze drifts slowly — half the frame rate is plenty and saves battery.
      odd = !odd;
      if (!force && !busy && odd && !rm) return;
      if (!force && rm && !busy && lastDrawn) return;
      last = now;
      lastDrawn = true;

      if (fading) mix = Math.min(1, mix + dt / (rm ? 0.2 : st.preview ? 0.5 : 0.8));

      // Aim: the catalog's open dark, or the film page's screen element.
      const aspect = window.innerWidth / window.innerHeight;
      let tgt = CATALOG;
      let filmOn = 0;
      let intensity = 1 - Math.min(1, scroll / (window.innerHeight * 0.85)) * 0.5;
      const el = st.mode === 'film' ? st.screen : null;
      if (el) {
        const b = el.getBoundingClientRect();
        const zs = 14;
        const toX = (px: number) => ((px / window.innerWidth) * 2 - 1) * aspect * (zs / FOCAL);
        const toY = (py: number) => (1 - (py / window.innerHeight) * 2) * (zs / FOCAL);
        tgt = { s: [0, 0.5, -1.2], zs, min: [toX(b.left), toY(b.bottom)], max: [toX(b.right), toY(b.top)] };
        filmOn = 1;
        intensity = b.bottom < 0 ? 0.4 : 0.45 + 0.35 * Math.min(1, b.bottom / (b.height + 1));
      }
      const k = rm ? 1 : 1 - Math.exp(-dt * 5);
      // Once the beam has arrived on the screen it follows it without lag (scrolling).
      const settled = el && cur.film > 0.98;
      const kr = settled ? 1 : k;
      for (let i = 0; i < 3; i++) cur.s[i] += (tgt.s[i] - cur.s[i]) * kr;
      cur.zs += (tgt.zs - cur.zs) * kr;
      for (let i = 0; i < 2; i++) {
        cur.min[i] += (tgt.min[i] - cur.min[i]) * kr;
        cur.max[i] += (tgt.max[i] - cur.max[i]) * kr;
      }
      cur.film += (filmOn - cur.film) * k;
      cur.ambient += ((target.image ? 1 : 0.3) - cur.ambient) * (rm ? 1 : 1 - Math.exp(-dt * 2));
      cur.intensity += (intensity - cur.intensity) * (rm ? 1 : 1 - Math.exp(-dt * 2.2));
      const meanT = lift(hexRgb(target.mean));
      for (let i = 0; i < 3; i++) cur.mean[i] += (meanT[i] - cur.mean[i]) * (rm ? 1 : 1 - Math.exp(-dt * 3));

      // Seats and the primary button glow pick up the beam colour (throttled; it's a root variable).
      if (now - lastVarAt > 140) {
        const v = cur.mean.map((x) => Math.round(x * 255)).join(' ');
        if (v !== lastBeamVar) {
          root.style.setProperty('--beam', v);
          lastBeamVar = v;
        }
        lastVarAt = now;
      }

      const time = rm ? 40 : (now - t0) / 1000;
      const set = (U: Record<string, WebGLUniformLocation | null>) => {
        gl.uniform2f(U.uRes, w, h);
        gl.uniform1f(U.uTime, time);
        gl.uniform1f(U.uAspect, aspect);
        gl.uniform1f(U.uFocal, FOCAL);
        gl.uniform3f(U.uS, cur.s[0], cur.s[1], cur.s[2]);
        gl.uniform2f(U.uRectMin, cur.min[0], cur.min[1]);
        gl.uniform2f(U.uRectMax, cur.max[0], cur.max[1]);
        gl.uniform1f(U.uZs, cur.zs);
        gl.uniform1f(U.uWarp, warp);
        gl.uniform1f(U.uMix, mix);
        gl.uniform1f(U.uIntensity, cur.intensity);
        gl.uniform1i(U.uImgA, 0);
        gl.uniform1i(U.uImgB, 1);
        gl.uniform1i(U.uNoise, 2);
      };
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texB);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, noiseTex);

      gl.disable(gl.BLEND);
      gl.useProgram(beamProg);
      set(UB);
      gl.uniform1f(UB.uFilm, cur.film);
      gl.uniform1f(UB.uGlow, 1 - cur.film);
      gl.uniform1f(UB.uAmbient, cur.ambient);
      // The seats band follows its DOM element (it scrolls with the page).
      const se = st.seats;
      const sr = se?.getBoundingClientRect();
      if (sr && sr.bottom > 0 && sr.top < window.innerHeight && sr.height > 8) {
        const k = h / window.innerHeight;
        gl.uniform4f(UB.uSeats, (window.innerHeight - sr.bottom) * k, sr.height * k, 1, 0);
      } else gl.uniform4f(UB.uSeats, 0, 0, 0, 0);
      gl.uniform3f(UB.uMean, cur.mean[0], cur.mean[1], cur.mean[2]);
      gl.bindBuffer(gl.ARRAY_BUFFER, tri);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(aPos);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(dustProg);
      set(UD);
      gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
      gl.enableVertexAttribArray(aP);
      gl.vertexAttribPointer(aP, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, MOTES);
      gl.disableVertexAttribArray(aP);
    };
    raf = requestAnimationFrame(frame);
    // Dev only: render on demand when the tab is hidden (automated visual checks).
    if (import.meta.env.DEV) {
      (window as unknown as { __projector: unknown }).__projector = {
        draw: (ms = 1200, step = 50) => {
          for (let t = 0; t <= ms; t += step) frame(performance.now() + t, true);
          // Snapshot in the same task (the drawing buffer is not preserved).
          const img = document.getElementById('projector-snap') as HTMLImageElement | null;
          if (img) img.src = canvas.toDataURL();
          return [w, h];
        },
      };
    }

    // Anything that changes the scene wakes a reduced-motion renderer for one more draw.
    const unsub = useProjector.subscribe(() => {
      lastDrawn = false;
      activeUntil = performance.now() + 900;
    });
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      root.classList.add('no-webgl');
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onLost);
    };
  }, []);

  return <canvas ref={ref} className="projector" aria-hidden="true" />;
}
