import { useEffect, useRef } from 'react';
import { useProjector } from '../store/useProjector';
import './Projector.css';

/**
 * Real-time projector light (WebGL fragment shader).
 * Volumetric fan of rays from a lens, coloured by the projected image,
 * visible through drifting smoke, with lens glare, the booth window and dust.
 * One fixed canvas behind the whole app; pages only describe the scene.
 *
 * Accessibility & performance: decorative (aria-hidden), rendered at reduced
 * resolution, paused when hidden, frozen (no time, no warp) under reduced motion,
 * hidden in the light theme, CSS fallback without WebGL.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uSrc;
uniform float uDir;
uniform float uSpread;
uniform float uIntensity;
uniform float uWarp;
uniform float uBooth;
uniform sampler2D uPal;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 s = vec2(uSrc.x * aspect, uSrc.y);
  vec2 d = p - s;
  float r = length(d);
  float ang = atan(d.y, d.x);
  float da = ang - uDir;
  da = atan(sin(da), cos(da));
  float spread = uSpread * (1.0 + uWarp * 0.8);
  float t = da / spread;
  float inside = 1.0 - smoothstep(0.8, 1.04, abs(t));
  float tt = clamp(t * 0.5 + 0.5, 0.0, 1.0);

  // The projected image becomes coloured bands; they shift slowly, like frames of a film.
  float b1 = noise(vec2(tt * 13.0, uTime * 0.11));
  float b2 = noise(vec2(tt * 41.0, uTime * 0.29 + 5.0));
  float bands = smoothstep(0.18, 0.92, b1 * 0.62 + b2 * 0.38);
  float lines = pow(noise(vec2(tt * 240.0, 2.0)), 4.0);
  vec3 pal = texture2D(uPal, vec2(tt, 0.5)).rgb;
  vec3 light = mix(pal, vec3(1.0), bands * 0.5);

  // Smoke: turbulent haze, stretched along the beam and drifting through it.
  vec2 axis = vec2(cos(uDir), sin(uDir));
  vec2 q = vec2(dot(d, axis), dot(d, vec2(-axis.y, axis.x)));
  float curl = fbm(p * 1.8 + vec2(uTime * 0.022, -uTime * 0.016));
  float smoke = fbm(vec2(q.x * 1.5 - uTime * 0.055, q.y * 3.6) + curl * 1.5);
  smoke = smoothstep(0.16, 0.9, smoke);
  float haze = 0.16 + 1.3 * smoke;

  // Energy: fierce at the lens, spreading out with distance.
  float fall = 1.0 / (0.3 + r * 2.4);
  fall *= smoothstep(0.0, 0.025, r);
  float beam = inside * haze * fall * (0.2 + bands * 1.0 + lines * 0.55);
  vec3 c = light * beam * uIntensity * 0.95;

  // Warp: streaks rushing outward along the rays when a film is opened.
  float dash = noise(vec2(tt * 90.0, log(r + 0.02) * 7.0 - uTime * 9.0));
  dash = smoothstep(0.58, 1.0, dash) * inside;
  c += light * dash * uWarp * fall * 2.6;
  c += vec3(0.85, 0.95, 1.0) * uWarp * 0.22 * inside * fall;

  // Lens glare, anamorphic streak and the booth window.
  float core = exp(-r * r * 2600.0) * 2.6 + exp(-r * r * 160.0) * 0.5 + exp(-r * 7.0) * 0.12;
  float streak = exp(-abs(d.y) * 260.0) * exp(-abs(d.x) * 5.0) * 0.55;
  vec2 bd = abs(d + vec2(0.0, 0.004)) - vec2(0.06, 0.03);
  float win = (1.0 - smoothstep(0.0, 0.006, max(bd.x, bd.y))) * 0.3;
  c += mix(vec3(0.82, 0.93, 1.0), pal, 0.3) * (core + streak + win) * uBooth * uIntensity;

  // The room: a faint bounce of the beam colour.
  c += pal * 0.03 * smoke * uIntensity;

  // Dust motes floating in the light.
  vec2 g = p * 55.0 + vec2(uTime * 0.15, uTime * 0.32);
  vec2 gi = floor(g);
  vec2 gf = fract(g);
  float h = hash(gi);
  vec2 mp = vec2(hash(gi + 3.1), hash(gi + 7.7)) * 0.8 + 0.1;
  float mote = smoothstep(0.1, 0.0, length(gf - mp)) * step(0.9, h);
  mote *= 0.5 + 0.5 * sin(uTime * (0.8 + h * 2.0) + h * 30.0);
  c += vec3(1.0) * mote * inside * fall * 1.2 * uIntensity;

  c += vec3(0.012, 0.014, 0.02);
  c = vec3(1.0) - exp(-c * 1.3);
  c += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}
`;

const hexToRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
  return sh;
}

export function Projector() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const root = document.documentElement;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) {
      root.classList.add('no-webgl');
      return;
    }

    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch (e) {
      console.warn('Projector disabled:', e);
      root.classList.add('no-webgl');
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      res: u('uRes'), time: u('uTime'), src: u('uSrc'), dir: u('uDir'), spread: u('uSpread'),
      intensity: u('uIntensity'), warp: u('uWarp'), booth: u('uBooth'), pal: u('uPal'),
    };

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.pal, 0);

    // Current (eased) values.
    const st = useProjector.getState();
    const cur = {
      sx: st.scene.src[0], sy: st.scene.src[1], dir: st.scene.dir, spread: st.scene.spread,
      intensity: 0, booth: st.scene.booth, dim: 0,
      pal: st.scene.palette.flatMap(hexToRgb),
    };
    const palBytes = new Uint8Array(16 * 4);

    const reduce = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'reduce';

    let w = 0, h = 0;
    const resize = () => {
      const phone = window.innerWidth < 700;
      const scale = Math.min(window.devicePixelRatio || 1, 2) * (phone ? 0.5 : 0.6);
      w = Math.max(2, Math.round(window.innerWidth * scale));
      h = Math.max(2, Math.round(window.innerHeight * scale));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      dirty = true;
    };
    let dirty = true;
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    const t0 = last;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (root.dataset.theme === 'light' || document.visibilityState !== 'visible') return;

      const { scene, preview, warpAt } = useProjector.getState();
      const rm = reduce();
      const k = rm ? 1 : 1 - Math.exp(-dt * 3.2);
      const kp = rm ? 1 : 1 - Math.exp(-dt * 2.4);
      const scroll = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
      const targetDim = scene.scrollDim * scroll;

      let delta = 0;
      const ease = (key: 'sx' | 'sy' | 'dir' | 'spread' | 'intensity' | 'booth' | 'dim', target: number, kk = k) => {
        const v = cur[key] + (target - cur[key]) * kk;
        delta += Math.abs(v - cur[key]);
        cur[key] = v;
      };
      ease('sx', scene.src[0]);
      ease('sy', scene.src[1]);
      ease('dir', scene.dir);
      ease('spread', scene.spread);
      ease('intensity', scene.intensity, rm ? 1 : 1 - Math.exp(-dt * 1.6));
      ease('booth', scene.booth);
      ease('dim', targetDim, rm ? 1 : 1 - Math.exp(-dt * 8));
      const pal = (preview ?? scene.palette).flatMap(hexToRgb);
      for (let i = 0; i < 48; i++) {
        const v = cur.pal[i] + (pal[i] - cur.pal[i]) * kp;
        delta += Math.abs(v - cur.pal[i]) / 255;
        cur.pal[i] = v;
      }

      const e = (now - warpAt) / 1000;
      const warp = rm || e < 0 || e > 1.6 ? 0 : e < 0.16 ? e / 0.16 : Math.exp(-(e - 0.16) * 3.2);

      // Under reduced motion, draw only when something actually changed.
      if (rm && !dirty && delta < 0.0005) return;
      dirty = false;

      for (let i = 0; i < 16; i++) {
        palBytes[i * 4] = cur.pal[i * 3];
        palBytes[i * 4 + 1] = cur.pal[i * 3 + 1];
        palBytes[i * 4 + 2] = cur.pal[i * 3 + 2];
        palBytes[i * 4 + 3] = 255;
      }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, palBytes);

      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.time, rm ? 12 : (now - t0) / 1000);
      gl.uniform2f(U.src, cur.sx, cur.sy);
      gl.uniform1f(U.dir, (cur.dir * Math.PI) / 180);
      gl.uniform1f(U.spread, (cur.spread * Math.PI) / 180);
      gl.uniform1f(U.intensity, cur.intensity * (1 - cur.dim));
      gl.uniform1f(U.warp, warp);
      gl.uniform1f(U.booth, cur.booth);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      root.classList.add('no-webgl');
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onLost);
    };
  }, []);

  return <canvas ref={ref} className="projector" aria-hidden="true" />;
}
