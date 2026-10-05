import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Dices, Play } from 'lucide-react';
import { FILM_BY_ID } from '../data/films';
import { useUI } from '../store/useUI';
import { formatRuntime } from '../lib/format';
import { Dialog } from './Overlay';
import { openFilm } from './FilmCase';
import './Roulette.css';

/**
 * «Решить за меня» — some people deliberately hand the final call to chance
 * (research: wheels, jars of titles). A reel of posters spins and decelerates
 * onto one. The choice is a suggestion: spin again or close freely.
 */
const ITEM = 132; // px, poster width + gap
const CYCLES = 6;

export function Roulette({ open, pool }: { open: boolean; pool: number[] }) {
  const close = useUI((s) => s.close);
  return (
    <Dialog open={open} onClose={close} title="Пусть решит случай" subtitle="Крутим только среди тех, что вы и так рассматривали." size="lg">
      {pool.length >= 2 && <Reel pool={pool} />}
    </Dialog>
  );
}

function Reel({ pool }: { pool: number[] }) {
  const close = useUI((s) => s.close);
  const reduce = useReducedMotion();
  const strip = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [spin, setSpin] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [target] = useState(() => ({ value: 0 }));

  const films = pool.map((id) => FILM_BY_ID.get(id)!);
  const reel = Array.from({ length: CYCLES }, () => films).flat();

  useLayoutEffect(() => {
    const el = strip.current;
    const vp = viewport.current;
    if (!el || !vp) return;
    setResult(null);
    const pick = Math.floor(Math.random() * films.length);
    target.value = pick;
    const index = (CYCLES - 1) * films.length + pick;
    const offset = index * ITEM - vp.clientWidth / 2 + ITEM / 2;
    if (reduce) {
      el.style.transform = `translateX(${-offset}px)`;
      setResult(films[pick].id);
      return;
    }
    // Slight overshoot-free deceleration, like a reel coming to rest.
    const anim = el.animate([{ transform: 'translateX(0px)' }, { transform: `translateX(${-offset}px)` }], {
      duration: 2600,
      easing: 'cubic-bezier(0.12, 0.75, 0.1, 1)',
      fill: 'forwards',
    });
    anim.onfinish = () => setResult(films[pick].id);
    return () => anim.cancel();
  }, [spin]);

  const chosen = result !== null ? FILM_BY_ID.get(result)! : null;

  useEffect(() => {
    if (chosen) document.getElementById('roulette-go')?.focus();
  }, [chosen]);

  return (
    <div className="reel">
      <div className="reel__viewport" ref={viewport} aria-hidden="true">
        <div className="reel__strip" ref={strip}>
          {reel.map((f, i) => (
            <img key={i} src={f.poster.src360} alt="" className="reel__item" style={{ width: ITEM - 12 }} />
          ))}
        </div>
        <div className="reel__gate" />
      </div>

      <div className="reel__result" aria-live="assertive">
        {chosen ? (
          <motion.div className="reel__card" style={{ ['--accent' as string]: chosen.ed.accent }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}>
            <p className="eyebrow">Сегодня смотрим</p>
            <p className="reel__title display">{chosen.title}</p>
            <p className="reel__meta">
              {formatRuntime(chosen.runtime)} · {chosen.year}
            </p>
            <p className="reel__fit">{chosen.ed.fitLine}</p>
            <div className="reel__acts">
              <button
                id="roulette-go"
                type="button"
                className="btn btn--primary"
                onClick={(e) => {
                  close();
                  openFilm(chosen, e);
                }}
              >
                <Play aria-hidden="true" /> Беру, к фильму
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setSpin((s) => s + 1)}>
                <Dices aria-hidden="true" /> Ещё раз
              </button>
            </div>
          </motion.div>
        ) : (
          <p className="reel__wait">Крутим плёнку…</p>
        )}
      </div>
    </div>
  );
}
