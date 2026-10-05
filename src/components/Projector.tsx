import { useEffect, useRef } from 'react';
import { createRenderLoop } from '../lib/renderLoop';
import { createProjectorReel, SHAFT_WIDTH } from '../lib/projectorReel';
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
 * The picture advances at 24 fps: subjects move quickly inside the fixed cone,
 * brief blends replace its light pattern, and occasional dissolves blend shots. The
 * haze rolls slowly; the lens and the light's direction stay fixed.
 *
 * Decorative (aria-hidden). Low resolution + soft haze, capped at 30 fps,
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
uniform float uLife;
uniform float uPan;
uniform sampler2D uImgA;
uniform sampler2D uImgB;
uniform sampler2D uNoise;
uniform sampler2D uShafts;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 frame(vec2 uv) {
  uv = clamp(uv, 0.0, 1.0);
  vec3 b = texture2D(uImgB, uv).rgb;
  if (uMix >= 1.0) return b;
  return mix(texture2D(uImgA, uv).rgb, b, uMix);
}
// One volume step spans several points of the picture near the viewer. Average
// that footprint too; filtering only the grain left sharp picture stripes
// stretched into isolated, nearly vertical rods in the surrounding haze.
vec3 frameFiltered(vec2 uv, float footprint) {
  vec2 offset = vec2(footprint / 3.0, 0.0);
  return frame(uv) * 0.5 + (frame(uv - offset) + frame(uv + offset)) * 0.25;
}
// The running film supplies moving subjects, camera pans and scene cuts. It
// changes the light within the cone, never the position or aim of the projector.
// xy: where the picture at this point came from, z: how much light it carries now.
// All of it is constant along each ray, so every band is a shaft sweeping the hall.
vec3 film(vec2 uv) {
  uv.x += uPan;
  vec3 s = texture2D(uShafts, vec2(uv.x, 0.5)).rgb;
  // Decode both displacement bytes after filtering. Eight-bit positions made
  // the fine rays jump sideways; this keeps the same path at sub-pixel precision.
  float displacement = (s.g * 256.0 + s.b) / 257.0;
  // Keep the image weave small: the former displacement stretched some picture
  // stripes to five times their width, creating the detached pale columns.
  return vec3(uv.x - (displacement - 0.5) * 0.125 * uLife, uv.y, mix(1.0, s.r * 3.0, uLife));
}
vec3 reel(vec2 uv) {
  vec3 f = film(uv);
  return frame(f.xy) * f.z;
}
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
uniform float uAmbient; // how much the hall itself takes on the frame (film vs. house light)
uniform float uEdge;    // once you're down at the wall: the film's light seeps in from the edges of your view
uniform vec3 uAccent;   // the pointed film's own colour
uniform float uGrain3;  // average of grain³ over the noise texture: what the streaks look like from too close
const int N = ${steps};

void main() {
  vec2 ndc = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  float focal = uFocal * (1.0 + uWarp * 0.16);
  vec3 d = normalize(vec3(ndc.x * uAspect, ndc.y, focal));
  float camZ = uWarp * 0.8;

  float tNear = 0.22 / d.z;
  float tFar = max(uZs - camZ, 1.0) / d.z;
  float ratio = tFar / tNear;
  // Stable spatial dither: only the film and haze move. Moving the sample grid
  // every frame made straight rays shimmer and appear to break into fragments.
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));

  vec3 acc = vec3(0.0);
  float tPrev = tNear;
  vec2 uvPrev = beamUV(d * tNear + vec3(0.0, 0.0, camZ));
  for (int i = 0; i < N; i++) {
    float t = tNear * pow(ratio, (float(i) + jitter) / float(N));
    float dt = t - tPrev;
    tPrev = t;
    vec3 P = d * t + vec3(0.0, 0.0, camZ);
    vec2 uv = beamUV(P);
    // How far across the frame this step travelled. Near the eye one step crosses many
    // streaks; detail that fine can't be resolved, so it gives its average light instead
    // of flickering noise (the near beam is out of focus anyway).
    float span = abs(uv.x - uvPrev.x);
    uvPrev = uv;
    float inside = insideBeam(uv, 0.03);
    if (inside <= 0.0) continue;

    // Haze: smoke rising through the warm beam. The fine layer is pushed around by
    // the broad one, so the smoke rolls and billows instead of sliding like wallpaper.
    // Smoke finer than one step can't be resolved along this ray; it averages out
    // (otherwise it turns into per-pixel noise). The big rolling shapes always stay.
    vec2 p1 = P.xy * 0.31 + vec2(P.z * 0.083, -P.z * 0.047) + vec2(uTime * 0.021, -uTime * 0.034);
    float n1 = mix(0.5, texture2D(uNoise, p1).r, 1.0 - 0.6 * smoothstep(0.3, 1.6, dt));
    vec2 p2 = P.xy * 0.92 + vec2(-P.z * 0.161, P.z * 0.107) + vec2(-uTime * 0.043, -uTime * 0.055) + (n1 - 0.5) * 0.32;
    float n = n1 * 0.6 + mix(0.5, texture2D(uNoise, p2).g, 1.0 - smoothstep(0.04, 0.3, dt)) * 0.4;
    // Thin, fairly even cinema haze reveals continuous shafts. Dense billows
    // made them look like separate cloudy columns instead of travelling light.
    float dens = 0.72 + 0.22 * (n - 0.5);

    // Fine streaks are constant along each ray: the detail of the projected image.
    // They ride with the picture, so the shafts themselves travel.
    vec3 f = film(uv);
    float grain = texture2D(uNoise, f.xy * vec2(2.7, 0.16) + vec2(0.37, 0.11)).b;
    float g3 = mix(uGrain3, grain * grain * grain, 1.0 - smoothstep(0.002, 0.012, span));
    // A real lens has an aperture. Near the viewer its rays overlap softly;
    // toward the screen the same light resolves back into the projected image.
    float aperture = 0.1 * max(uZs - P.z, 0.0) / ((P.z - uS.z) * (uRectMax.x - uRectMin.x));
    // Fine detail rides inside the main shafts instead of becoming bright rods
    // of its own. Preserve its mean exposure while reducing the peak contrast.
    vec3 img = pow(frameFiltered(f.xy, span + aperture) * f.z, vec3(1.3)) * (0.22 + 2.2 * mix(uGrain3, g3, 0.38));

    vec3 L = P - uS;
    float r2 = dot(L, L);
    float irr = 1.0 / (0.55 + r2);

    // Warp: dashes of light rushing along the rays.
    float boost = 1.0;
    if (uWarp > 0.001) {
      float s = log(r2) * 1.7 - uTime * 7.5;
      float dash = texture2D(uNoise, vec2(uv.x * 4.7 + uv.y * 2.1, s * 0.19)).b;
      boost += uWarp * (smoothstep(0.5, 0.92, dash) * 9.0 + 0.8);
    }

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
    // Feather the spill into the picture too. A hard outside-only cutoff exposed
    // the otherwise invisible projection target as a dark rectangle on the backdrop.
    float feather = min(hs.x, hs.y) * 0.35;
    float spill = exp(-max(dist, 0.0) / (hs.x * 0.7)) * smoothstep(-feather, feather, dist);
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
  vec3 amb = reel(vec2(ndc.x * 0.5 + 0.5, ndc.y * 0.32 + 0.6));
  float ambW = smoothstep(1.5, 0.0, length(vec2(ndc.x * 0.75, (ndc.y - 0.3) * 1.15)));
  c += amb * amb * ambW * 0.11 * uAmbient * uIntensity;
  // Peripheral spill: strongest at the sides, gone well before the reading column.
  float side = smoothstep(0.62, 1.0, abs(ndc.x));
  float low = smoothstep(-1.0, 0.2, -ndc.y) * 0.35;
  vec3 spill = mix(uAccent, frame(vec2(ndc.x * 0.5 + 0.5, 0.5)), 0.25);
  c += spill * (side * side + low * side) * 0.2 * uEdge;

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
  // Motes ride the air stirred by the warm beam: slow swirls with a small, quicker eddy.
  P.x += sin(uTime * 0.11 + s * 20.0) * 0.24 + sin(uTime * 0.31 + s * 9.0) * 0.04;
  P.y += sin(uTime * 0.08 + s * 13.0) * 0.17 - uTime * 0.006 * (0.4 + fract(s * 7.0));
  P.y = mod(P.y + 1.6, 4.4) - 1.6;
  P.z += cos(uTime * 0.09 + s * 31.0) * 0.27;
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
  // A mote glints when a bright shaft of the moving picture crosses it.
  gl_FragColor = vec4(mix(reel(vUV), vec3(1.0), 0.35) * a * uIntensity * 3.2, 1.0);
}
`;

// ─── Textures ─────────────────────────────────────────────────────────────

/** Cached across Strict Mode mounts: generating haze must not block startup twice. */
let cachedNoise: Uint8Array | undefined;

/** Tiling noise: R/G = domain-warped smoke at two scales, B = fine grain. */
function makeNoise(size = 256): Uint8Array {
  if (cachedNoise) return cachedNoise;
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
  cachedNoise = out;
  return out;
}

/** The house reel: cyan, teal and white streaks, like the light of an empty projector. */
function makeHouseFrame(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  // Same resolution as a film's beam frame: finer stripes would only alias into noise near
  // the eye. The fine streaks you see far down the beam come from the lens grain instead.
  c.width = 192;
  c.height = 24;
  const g = c.getContext('2d')!;
  g.scale(192 / 512, 24 / 64);
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
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(sh) ?? 'shader';
    gl.deleteShader(sh);
    throw new Error(message);
  }
  return sh;
}
function program(gl: WebGLRenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  const shaders: WebGLShader[] = [];
  let linked = false;
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
      const shader = compile(gl, type, source);
      shaders.push(shader);
      gl.attachShader(p, shader);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    linked = true;
    return p;
  } finally {
    for (const shader of shaders) {
      gl.detachShader(p, shader);
      gl.deleteShader(shader);
    }
    if (!linked) gl.deleteProgram(p);
  }
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
    root.classList.remove('no-webgl');
    const phone = Math.min(window.innerWidth, window.innerHeight) < 600;
    let disposed = false;

    let beamProg: WebGLProgram | undefined, dustProg: WebGLProgram;
    try {
      beamProg = program(gl, VERT, BEAM_FRAG(phone ? 18 : 28));
      dustProg = program(gl, DUST_VERT, DUST_FRAG);
    } catch (e) {
      if (beamProg) gl.deleteProgram(beamProg);
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
    const noise = makeNoise();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, noise);
    let grain3 = 0;
    for (let i = 2; i < noise.length; i += 4) grain3 += (noise[i] / 255) ** 3;
    grain3 /= noise.length / 4;
    const texA = tex(false);
    const texB = tex(false);
    const house = makeHouseFrame();
    for (const t of [texA, texB]) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, house);
    }

    const reel = createProjectorReel();
    const shafts = new Uint8Array(SHAFT_WIDTH * 4);
    const shaftTex = tex(false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHAFT_WIDTH, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, shafts);

    const uniforms = (p: WebGLProgram) => {
      const names = ['uRes', 'uTime', 'uAspect', 'uFocal', 'uS', 'uRectMin', 'uRectMax', 'uZs', 'uWarp', 'uMix', 'uIntensity', 'uImgA', 'uImgB', 'uNoise', 'uFilm', 'uMean', 'uGlow', 'uAmbient', 'uEdge', 'uAccent', 'uLife', 'uPan', 'uShafts', 'uGrain3'];
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
      if (disposed) return;
      if (cache.has(url)) return then();
      if (pending.has(url)) return;
      pending.add(url);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (disposed) return;
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
      wake();
    };

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => motion.matches || root.dataset.motion === 'reduce';
    const enabled = () => !disposed && !gl.isContextLost() && root.dataset.theme !== 'light' && document.visibilityState === 'visible';

    let w = 0, h = 0, viewW = 0, viewH = 0;
    let scale = phone ? 0.32 : 0.4;
    const resize = () => {
      // Match the actual CSS canvas (100lvh can differ from innerHeight on mobile).
      viewW = Math.max(1, canvas.clientWidth);
      viewH = Math.max(1, canvas.clientHeight);
      const px = Math.min(1, Math.sqrt(280_000 / (viewW * viewH * scale * scale)));
      w = Math.max(2, Math.round(viewW * scale * px));
      h = Math.max(2, Math.round(viewH * scale * px));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();

    // Eased scene state.
    const cur = {
      s: [...CATALOG.s], zs: CATALOG.zs, min: [...CATALOG.min], max: [...CATALOG.max],
      film: 0, intensity: 0, ambient: 0.3, edge: 0, mean: lift(hexRgb(HOUSE.mean)), accent: lift(hexRgb(HOUSE.mean)),
    };
    let lastBeamVar = '';
    let lastVarAt = 0;
    let last = performance.now();
    const t0 = last;
    let slowFrames = 0;
    let drawn = 0;

    const frame = (now: number, force = false): boolean => {
      if (disposed || gl.isContextLost()) return false;
      if (!force && !enabled()) return false;
      const elapsed = now - last;
      const dt = Math.min(0.1, Math.max(0, elapsed) / 1000);
      const st = useProjector.getState();
      const rm = reduce();
      // Give a struggling GPU less work; scroll no longer increases the frame rate.
      if (!force && !rm) {
        slowFrames = elapsed > 70 && elapsed < 250 ? slowFrames + 1 : 0;
        if (slowFrames >= 8 && scale > 0.25) {
          scale = Math.max(0.25, scale * 0.85);
          resize();
          slowFrames = 0;
        }
      }
      last = now;

      // Which frame should the light carry?
      const target: Frame = st.preview ?? st.frame;
      if (target.image !== wantKey) {
        wantKey = target.image;
        load(wantKey, () => wantKey === target.image && begin(wantKey));
      }

      const scroll = window.scrollY;
      const warpE = (now - st.warpAt) / 1000;
      const warp = rm || warpE < 0 || warpE > 1.5 ? 0 : warpE < 0.18 ? warpE / 0.18 : Math.exp(-(warpE - 0.18) * 3.1);
      const fading = mix < 1;
      if (fading) mix = Math.min(1, mix + dt / (rm ? 0.2 : st.preview ? 0.5 : 0.8));

      // Aim: the catalog's open dark, or the film page's screen element.
      const aspect = viewW / viewH;
      let tgt = CATALOG;
      let filmOn = 0;
      const down = Math.min(1, scroll / (viewH * 0.85));
      let intensity = 1 - down * 0.72;
      const edgeT = st.mode === 'catalog' ? down * (st.preview ? 1 : 0.55) : 0;
      const el = st.mode === 'film' ? st.screen : null;
      if (el) {
        const b = el.getBoundingClientRect();
        const zs = 14;
        const toX = (px: number) => ((px / viewW) * 2 - 1) * aspect * (zs / FOCAL);
        const toY = (py: number) => (1 - (py / viewH) * 2) * (zs / FOCAL);
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
      cur.edge += (edgeT - cur.edge) * (rm ? 1 : 1 - Math.exp(-dt * 3));
      cur.intensity += (intensity - cur.intensity) * (rm ? 1 : 1 - Math.exp(-dt * 2.2));
      const meanT = lift(hexRgb(target.mean));
      const accT = hexRgb(target.accent ?? target.mean);
      for (let i = 0; i < 3; i++) cur.accent[i] += (accT[i] - cur.accent[i]) * (rm ? 1 : 1 - Math.exp(-dt * 3));
      for (let i = 0; i < 3; i++) cur.mean[i] += (meanT[i] - cur.mean[i]) * (rm ? 1 : 1 - Math.exp(-dt * 3));

      // The primary button glow picks up the beam colour (throttled; it's a root variable).
      if (now - lastVarAt > 140) {
        const v = cur.mean.map((x) => Math.round(x * 255)).join(' ');
        if (v !== lastBeamVar) {
          root.style.setProperty('--beam', v);
          lastBeamVar = v;
        }
        lastVarAt = now;
      }

      const time = rm ? 40 : (now - t0) / 1000;
      // On the film page the screen shows a still, so the picture in the beam plays calmer.
      const life = 1 - 0.3 * cur.film;
      const picture = reel.sample(time, shafts);
      const flick = rm ? 1 : picture.exposure;
      const pan = picture.pan * life;
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
        gl.uniform1f(U.uIntensity, cur.intensity * flick);
        gl.uniform1f(U.uLife, life);
        gl.uniform1f(U.uPan, pan);
        gl.uniform1i(U.uImgA, 0);
        gl.uniform1i(U.uImgB, 1);
        gl.uniform1i(U.uNoise, 2);
        gl.uniform1i(U.uShafts, 3);
      };
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texB);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, noiseTex);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, shaftTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SHAFT_WIDTH, 1, gl.RGBA, gl.UNSIGNED_BYTE, shafts);

      gl.disable(gl.BLEND);
      gl.useProgram(beamProg);
      set(UB);
      gl.uniform1f(UB.uFilm, cur.film);
      gl.uniform1f(UB.uGlow, 1 - cur.film);
      gl.uniform1f(UB.uAmbient, cur.ambient);
      gl.uniform1f(UB.uEdge, cur.edge);
      gl.uniform3f(UB.uAccent, cur.accent[0], cur.accent[1], cur.accent[2]);
      gl.uniform1f(UB.uGrain3, grain3);
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
      if (import.meta.env.DEV) canvas.dataset.draws = String(++drawn);
      return !rm || mix < 1;
    };
    const loop = createRenderLoop(frame, enabled);
    const wake = () => { if (enabled()) loop.wake(); else loop.stop(); };
    const onResize = () => { resize(); wake(); };
    const prefs = new MutationObserver(() => {
      // A light-theme canvas is display:none; measure it again when the hall reopens.
      if (enabled()) resize();
      wake();
    });
    prefs.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-motion', 'data-text', 'data-contrast'] });
    motion.addEventListener('change', wake);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', wake, { passive: true });
    loop.wake();
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
        state: () => JSON.parse(JSON.stringify({ ...cur, preview: useProjector.getState().preview, scroll: window.scrollY })),
      };
    }

    // Anything that changes the scene wakes a reduced-motion renderer for one more draw.
    const unsub = useProjector.subscribe(wake);
    const onLost = (e: Event) => {
      e.preventDefault();
      loop.stop();
      root.classList.add('no-webgl');
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => {
      disposed = true;
      loop.dispose();
      unsub();
      prefs.disconnect();
      motion.removeEventListener('change', wake);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', wake);
      canvas.removeEventListener('webglcontextlost', onLost);
      for (const texture of [noiseTex, texA, texB, shaftTex]) gl.deleteTexture(texture);
      gl.deleteBuffer(tri);
      gl.deleteBuffer(dustBuf);
      gl.deleteProgram(beamProg);
      gl.deleteProgram(dustProg);
      if (import.meta.env.DEV) delete (window as unknown as { __projector?: unknown }).__projector;
    };
  }, []);

  return <canvas ref={ref} className="projector" aria-hidden="true" />;
}
