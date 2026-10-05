import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { Film } from '../data/types';
import { useProjector } from '../store/useProjector';
import { useStore } from '../store/useStore';
import './Screen.css';

/**
 * The film itself, at the front: its frames fill the screen ahead and blend
 * into the dark hall. The projector aims at this element, so the beam lands
 * on the image and carries the colours of the frame that is showing.
 * Frames advance on their own (with a pause button), never under reduced motion.
 */
const DWELL = 7000;

export function FilmBackdrop({ film, onSwipe, className = '' }: { film: Film; onSwipe?: (dir: -1 | 1) => void; className?: string }) {
  const frames = film.stills.length
    ? film.stills.map((s) => ({ src: s.src1280, srcSet: `${s.src640} 640w, ${s.src1280} 1280w`, beam: s.beam, mean: s.mean }))
    : [{ src: film.poster.src720, srcSet: `${film.poster.src360} 360w, ${film.poster.src720} 720w`, beam: film.poster.beam, mean: film.poster.mean }];
  // Either the system preference or the in-app «Меньше движения» stops the frames advancing.
  const reduce = useReducedMotion() || useStore.getState().prefs.motion === 'reduce';
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const [held, setHeld] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const setScreen = useProjector((s) => s.setScreen);
  const setFrame = useProjector((s) => s.setFrame);

  useEffect(() => {
    setScreen(ref.current);
    return () => setScreen(null);
  }, [setScreen]);

  useEffect(() => {
    const f = frames[i];
    if (f) setFrame({ image: f.beam, mean: f.mean });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, film.id]);

  useEffect(() => {
    if (!playing || held || frames.length < 2) return;
    const id = window.setTimeout(() => setI((x) => (x + 1) % frames.length), DWELL);
    return () => window.clearTimeout(id);
  }, [i, playing, held, frames.length]);

  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const go = (d: number) => setI((x) => (x + d + frames.length) % frames.length);

  return (
    <div
      className={`backdrop ${className}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse') start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s || !onSwipe) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        const v = Math.abs(dx) / Math.max(1, performance.now() - s.t);
        if (Math.abs(dx) > Math.abs(dy) * 1.4 && (Math.abs(dx) > 70 || v > 0.5)) onSwipe(dx < 0 ? 1 : -1);
      }}
    >
      {/* The projector aims here: the part of the screen where the film is fully visible. */}
      <div className="backdrop__aim" ref={ref} aria-hidden="true" />
      <div className="backdrop__frames" aria-hidden="true">
        {frames.map((f, j) => (
          <img
            key={f.src}
            className={`backdrop__img ${j === i ? 'is-on' : ''}`}
            src={f.src}
            srcSet={f.srcSet}
            sizes="100vw"
            alt=""
            loading={j < 2 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
      </div>
      {frames.length > 1 && (
        <div
          className="backdrop__ctl"
          role="group"
          aria-label="Кадры из фильма"
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
        >
          <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="Предыдущий кадр">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Остановить смену кадров' : 'Показывать кадры по очереди'}
            aria-pressed={!playing}
          >
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <button type="button" className="icon-btn" onClick={() => go(1)} aria-label="Следующий кадр">
            <ChevronRight aria-hidden="true" />
          </button>
          <span className="backdrop__count" aria-live="polite">
            {i + 1} / {frames.length}
          </span>
          <span className="backdrop__credit">Кадры: TMDB</span>
        </div>
      )}
    </div>
  );
}
