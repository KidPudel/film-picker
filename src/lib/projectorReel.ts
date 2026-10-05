/**
 * A synthetic moving picture, not a moving projector. Its 24 fps image supplies
 * the light distribution inside the fixed cone. Brief blends soften each edit;
 * occasional dissolves last longer. Haze and lens geometry have their own clocks.
 *
 * Film transport reference: https://acofs.org.au/chapter_2.htm
 * Shot lengths are an art-direction choice, not a property of the projector.
 */
export const SHAFT_WIDTH = 256;
const FPS = 24;
const TAU = Math.PI * 2;

type Band = {
  x: number; width: number; light: number; phase: number;
  travel: number; speed: number; action: number;
};
type Shot = {
  start: number; length: number; dissolve: number;
  pan: number; speed: number; exposure: number; bands: Band[];
};

const SHOTS: Shot[] = (() => {
  let seed = 29, start = 0;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 24 }, (_, index) => {
    const length = index % 7 === 3 ? 28 + Math.floor(random() * 20) : 48 + Math.floor(random() * 48);
    const count = 9 + Math.floor(random() * 4);
    const shot: Shot = {
      // Include the first shot: it blends from the last shot on every wrap.
      start, length, dissolve: index % 6 === 5 ? 12 : 6,
      pan: (random() - 0.5) * 0.06,
      speed: (random() - 0.5) * 0.045,
      exposure: 0.97 + random() * 0.06,
      bands: Array.from({ length: count }, (_, i) => ({
        x: (i + 0.5) / count + (random() - 0.5) * 0.07,
        width: 0.012 + random() * 0.035,
        light: 0.6 + random() * 1.1,
        phase: random() * TAU,
        travel: 0.016 + random() * 0.038,
        speed: 1.4 + random() * 2.6,
        action: 4 + random() * 5,
      })),
    };
    start += length;
    return shot;
  });
})();
const REEL_FRAMES = SHOTS[SHOTS.length - 1].start + SHOTS[SHOTS.length - 1].length;
export const PROJECTOR_REEL_DURATION = REEL_FRAMES / FPS;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const frameNoise = (n: number) => {
  const value = Math.sin(n * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

/** Independent scratch buffers per renderer; sampling is seekable and allocation-free. */
export function createProjectorReel() {
  const light = [new Float32Array(SHAFT_WIDTH), new Float32Array(SHAFT_WIDTH)];
  const result = { pan: 0, exposure: 1, shot: 0, frame: 0, transition: 1 };

  function picture(shot: Shot, age: number, slot: number) {
    const time = age / FPS;
    // Camera movement belongs to this shot's illumination. Blending pictures
    // fades their moving subjects; it must not drag the underlying fine rays
    // toward the next shot's unrelated camera position.
    const camera = (shot.pan + shot.speed * (time - shot.length / FPS / 2)) * 0.25;
    const L = light[slot];
    L.fill(0.24);
    for (const band of shot.bands) {
      // Moving subjects and camera motion redistribute light in fractions of a
      // second. Small details change faster than the broad shape of a shot.
      const off = band.travel * Math.sin(time * band.speed + band.phase);
      const centre = band.x + off + camera;
      const width = band.width * (1 + 0.12 * Math.sin(time * band.action + band.phase));
      const light = band.light * (0.65 + 0.17 * Math.sin(time * band.action + band.phase)
        + 0.06 * Math.sin(time * band.action * 1.71 + band.phase * 2));
      for (let i = 0; i < SHAFT_WIDTH; i++) {
        const u = (i + 0.5) / SHAFT_WIDTH;
        const d = (u - centre) / width;
        L[i] += light * Math.exp(-0.5 * d * d);
      }
    }
    let mean = 0;
    for (let i = 0; i < SHAFT_WIDTH; i++) mean += L[i];
    mean /= SHAFT_WIDTH;
    for (let i = 0; i < SHAFT_WIDTH; i++) {
      L[i] = 1 + (L[i] / mean - 1) * 0.78;
    }
  }

  return {
    sample(seconds: number, out: Uint8Array) {
      const frame = Math.floor(Math.max(0, seconds) * FPS);
      const reelFrame = frame % REEL_FRAMES;
      const phase = reelFrame / REEL_FRAMES * TAU;
      let index = SHOTS.length - 1;
      while (SHOTS[index].start > reelFrame) index--;
      const shot = SHOTS[index];
      const age = reelFrame - shot.start;
      picture(shot, age, 0);
      let transition = 1, previousExposure = shot.exposure;
      if (age < shot.dissolve) {
        const previous = SHOTS[(index + SHOTS.length - 1) % SHOTS.length];
        picture(previous, previous.length + age, 1);
        previousExposure = previous.exposure;
        const progress = age / shot.dissolve;
        transition = progress * progress * (3 - 2 * progress);
      }
      for (let i = 0; i < SHAFT_WIDTH; i++) {
        const L = transition === 1 ? light[0][i] : lerp(light[1][i], light[0][i], transition);
        // Fine image flow also follows the reel's continuous clock. Resetting
        // it with each shot could still pull individual rays sideways at edits.
        const u = (i + 0.5) / SHAFT_WIDTH;
        const D = 0.003 * Math.sin(phase * 11 + u * TAU * 1.4)
          + 0.0015 * Math.sin(phase * 19 - u * TAU * 0.85);
        const encoded = Math.min(65535, Math.max(0, Math.round((D / 0.25 + 0.5) * 65535)));
        out[i * 4] = Math.min(255, Math.round(L / 3 * 255));
        out[i * 4 + 1] = encoded >> 8;
        out[i * 4 + 2] = encoded & 255;
        out[i * 4 + 3] = 255;
      }
      // One periodic path for the whole reel. The former per-shot pan crossed
      // as much as 1.7% of the image in a frame during an edit (20× normal speed).
      // Both position and velocity now match across edits and the loop seam.
      result.pan = 0.011 * Math.sin(phase * 8 + 0.4) + 0.003 * Math.sin(phase * 17 + 1.2);
      // Scene exposure changes at edits; the lamp itself is nearly steady.
      result.exposure = lerp(previousExposure, shot.exposure, transition) * (1 + 0.006 * (frameNoise(reelFrame) - 0.5));
      result.shot = index;
      result.frame = frame;
      result.transition = transition;
      return result;
    },
  };
}
