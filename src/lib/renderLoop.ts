type FrameScheduler = {
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
};

const browserFrames: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

/** A capped, demand-driven loop. Draw returns false when the scene has settled. */
export function createRenderLoop(
  draw: (now: number) => boolean,
  enabled: () => boolean,
  scheduler: FrameScheduler = browserFrames,
  fps = 30,
) {
  let pending = 0;
  let last = -Infinity;
  let disposed = false;
  const interval = 1000 / fps;
  const wake = () => {
    if (!disposed && !pending && enabled()) pending = scheduler.request(tick);
  };
  const tick = (now: number) => {
    pending = 0;
    if (disposed || !enabled()) return;
    if (now - last < interval - 0.1) return wake();
    last = now;
    if (draw(now)) wake();
  };
  const stop = () => {
    scheduler.cancel(pending);
    pending = 0;
    last = -Infinity;
  };
  return { wake, stop, dispose: () => { disposed = true; stop(); } };
}
