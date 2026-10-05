import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderLoop } from '../src/lib/renderLoop.ts';

function frames() {
  let id = 0;
  const queued = new Map();
  return {
    request: (callback) => { queued.set(++id, callback); return id; },
    cancel: (id) => queued.delete(id),
    tick: (now) => { const callbacks = [...queued.values()]; queued.clear(); callbacks.forEach((callback) => callback(now)); },
    pending: () => queued.size,
  };
}

for (const hz of [60, 120, 144]) {
  test(`caps decorative rendering at 30 fps on a ${hz} Hz display`, () => {
    const clock = frames();
    const drawn = [];
    const loop = createRenderLoop((now) => { drawn.push(now); return true; }, () => true, clock);
    loop.wake();
    for (let t = 0; t < 1000; t += 1000 / hz) clock.tick(t);
    assert.ok(drawn.length <= 31, `Drew ${drawn.length} frames`);
    for (let i = 1; i < drawn.length; i++) assert.ok(drawn[i] - drawn[i - 1] >= 1000 / 30 - 0.1);
    loop.dispose();
    assert.equal(clock.pending(), 0);
  });
}

test('a still scene draws once, then sleeps until invalidated', () => {
  const clock = frames();
  let draws = 0;
  const loop = createRenderLoop(() => { draws++; return false; }, () => true, clock);
  loop.wake();
  loop.wake();
  assert.equal(clock.pending(), 1);
  clock.tick(0);
  assert.equal(draws, 1);
  assert.equal(clock.pending(), 0);
  loop.wake();
  clock.tick(100);
  assert.equal(draws, 2);
  assert.equal(clock.pending(), 0);
});

test('hidden or disabled scenes do no work and resume when enabled', () => {
  const clock = frames();
  let enabled = true;
  let draws = 0;
  const loop = createRenderLoop(() => { draws++; return true; }, () => enabled, clock);
  loop.wake();
  enabled = false;
  clock.tick(0);
  assert.equal(draws, 0);
  assert.equal(clock.pending(), 0);
  loop.wake();
  assert.equal(clock.pending(), 0);
  enabled = true;
  loop.wake();
  clock.tick(100);
  assert.equal(draws, 1);
  loop.stop();
  assert.equal(clock.pending(), 0);
  loop.wake();
  clock.tick(101);
  assert.equal(draws, 2);
  loop.dispose();
  loop.wake();
  assert.equal(clock.pending(), 0);
});
