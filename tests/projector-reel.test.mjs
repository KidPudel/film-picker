import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProjectorReel, SHAFT_WIDTH, PROJECTOR_REEL_DURATION } from '../src/lib/projectorReel.ts';

const buffer = () => new Uint8Array(SHAFT_WIDTH * 4);
const difference = (a, b) => {
  let sum = 0;
  for (let i = 0; i < SHAFT_WIDTH; i++) sum += Math.abs(a[i * 4] - b[i * 4]) / 255;
  return sum / SHAFT_WIDTH;
};

test('holds each film frame and remains deterministic after seeking', () => {
  const reel = createProjectorReel(), a = buffer(), b = buffer();
  const first = { ...reel.sample(4.001, a) };
  assert.deepEqual(reel.sample(4.035, b), first);
  assert.deepEqual(a, b);
  reel.sample(60, b);
  assert.deepEqual(reel.sample(4.001, b), first);
  assert.deepEqual(a, b);
  assert.deepEqual(createProjectorReel().sample(4.001, b), first);
  assert.deepEqual(a, b);
});

test('keeps quick movie movement while blending every edit', () => {
  const reel = createProjectorReel(), current = buffer(), previous = buffer();
  let previousShot = 0, edits = 0, movingFrames = 0;
  for (let frame = 0; frame < 24 * 70; frame++) {
    const sample = reel.sample((frame + 0.01) / 24, current);
    const change = difference(current, previous);
    if (frame > 0 && sample.shot !== previousShot) {
      edits++;
      assert.equal(sample.transition, 0, 'An edit must start from the outgoing picture');
    } else if (frame > 0 && change > 0.004) movingFrames++;
    if (frame > 0) assert.ok(change < 0.08, 'No frame should abruptly replace the entire light pattern');
    previousShot = sample.shot;
    previous.set(current);
  }
  assert.ok(edits >= 20);
  assert.ok(movingFrames > 1200, 'The movie must move between its edits');
});

test('repeats exactly and crosses the end of the reel without a hard reset', () => {
  const reel = createProjectorReel(), a = buffer(), b = buffer();
  for (const time of [0.001, 0.1, 0.3, 1.2, 12.5, 40]) {
    const first = { ...reel.sample(time, a) };
    const repeated = reel.sample(time + PROJECTOR_REEL_DURATION, b);
    assert.deepEqual(a, b);
    for (const key of ['pan', 'exposure', 'shot', 'transition']) assert.equal(repeated[key], first[key]);
  }
  const before = { ...reel.sample(PROJECTOR_REEL_DURATION - 1 / 24 + 0.001, a) };
  const after = reel.sample(PROJECTOR_REEL_DURATION + 0.001, b);
  assert.ok(difference(a, b) < 0.025, 'The loop boundary must look like an ordinary moving frame');
  assert.ok(Math.abs(before.pan - after.pan) < 0.002);
  assert.ok(Math.abs(before.exposure - after.exposure) < 0.006);
});

test('keeps exposure bounded and fine image rays from folding into columns', () => {
  const reel = createProjectorReel(), out = buffer();
  for (let frame = 0; frame < 24 * 90; frame++) {
    const { exposure, pan } = reel.sample((frame + 0.01) / 24, out);
    assert.ok(exposure > 0.96 && exposure < 1.04, 'Scene exposure must stay quiet');
    assert.ok(Math.abs(pan) < 0.08);
    for (let i = 1; i < SHAFT_WIDTH; i++) {
      const displacement = (out[i * 4 + 1] * 256 + out[i * 4 + 2]) / 65535;
      const prior = (out[(i - 1) * 4 + 1] * 256 + out[(i - 1) * 4 + 2]) / 65535;
      const slope = 1 - (displacement - prior) * 0.125 * SHAFT_WIDTH;
      assert.ok(slope > 0.85 && slope < 1.15, 'Image weave must preserve fine stripe widths');
    }
  }
});

for (const fps of [24, 30]) test(`fine rays stay continuous across edits and loops at ${fps} fps`, () => {
  const reel = createProjectorReel(), out = buffer();
  const prior = new Float64Array(64);
  const duration = Math.ceil(PROJECTOR_REEL_DURATION * fps) * 2;
  for (let frame = 0; frame < duration; frame++) {
    const { pan } = reel.sample((frame + 0.01) / fps, out);
    for (let i = 0; i < prior.length; i++) {
      // Mirror the filtered image coordinate, including the displaced sample
      // location. Light fading alone previously passed despite a 20× pan jump.
      const u = (i + 0.5) / prior.length;
      const x = Math.min(SHAFT_WIDTH - 1, Math.max(0, (u + pan) * SHAFT_WIDTH - 0.5));
      const left = Math.floor(x), right = Math.min(SHAFT_WIDTH - 1, left + 1);
      const decode = index => (out[index * 4 + 1] * 256 + out[index * 4 + 2]) / 65535;
      const displacement = decode(left) + (decode(right) - decode(left)) * (x - left);
      const position = u + pan - (displacement - 0.5) * 0.125;
      if (frame > 0) assert.ok(Math.abs(position - prior[i]) < 0.0015,
        `A thin ray jumped at frame ${frame}, sample ${i}`);
      prior[i] = position;
    }
  }
});
