import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Columns2, Dices, Users, X } from 'lucide-react';
import { useStore, MAX_TICKETS } from '../store/useStore';
import { toast, useUI } from '../store/useUI';
import { FILM_BY_ID } from '../data/films';
import { finishTime, formatRuntime } from '../lib/format';
import { useNow } from '../lib/hooks';
import { useRoute } from '../lib/router';
import { openFilm } from './FilmCase';
import './TicketTray.css';

/**
 * «Билеты на вечер» — the small shortlist (max 3) that follows you between pages,
 * so you never have to remember what you were considering.
 */
export function TicketTray() {
  const tickets = useStore((s) => s.tickets);
  const removeTicket = useStore((s) => s.removeTicket);
  const open = useUI((s) => s.open);
  const route = useRoute();
  const now = useNow();
  const ref = useRef<HTMLDivElement>(null);
  const films = tickets.map((id) => FILM_BY_ID.get(id)!).filter(Boolean);

  // Publish the tray height so toasts and page padding can make room.
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el || !films.length) {
      root.style.setProperty('--tray-h', '0px');
      return;
    }
    const ro = new ResizeObserver(() => root.style.setProperty('--tray-h', `${el.offsetHeight + 12}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty('--tray-h', '0px');
    };
  }, [films.length > 0]);

  return (
    <AnimatePresence>
      {films.length > 0 && (
        <motion.div
          ref={ref}
          className={`tray ${route.name === 'film' ? 'tray--film' : ''}`}
          role="region"
          aria-label="Билеты на вечер"
          initial={{ y: '120%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '120%', opacity: 0 }}
          transition={{ type: 'spring', duration: 0.45, bounce: 0.12 }}
        >
          <div className="tray__head">
            <p className="tray__title">Билеты на вечер</p>
            <p className="tray__count" role="img" aria-label={`Билетов: ${films.length} из ${MAX_TICKETS}`}>
              {Array.from({ length: MAX_TICKETS }, (_, i) => (
                <span key={i} className={i < films.length ? 'is-on' : ''} />
              ))}
            </p>
          </div>
          <ul className="tray__stubs">
            <AnimatePresence initial={false}>
              {films.map((f) => (
                <motion.li
                  key={f.id}
                  layout
                  className="stub"
                  style={{ ['--accent' as string]: f.ed.accent }}
                  initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
                >
                  <a href={`#/film/${f.slug}`} className="stub__link" onClick={(e) => openFilm(f, e)}>
                    <img src={f.poster.src360} alt="" className="stub__img" />
                    <span className="stub__text">
                      <span className="stub__title">{f.title}</span>
                      <span className="stub__time">
                        {formatRuntime(f.runtime)} · до {finishTime(f.runtime, now)}
                      </span>
                    </span>
                  </a>
                  <button
                    type="button"
                    className="stub__x"
                    aria-label={`Убрать билет на «${f.title}»`}
                    onClick={() => {
                      removeTicket(f.id);
                      toast(`Билет на «${f.title}» убран`, { label: 'Вернуть', run: () => useStore.getState().toggleTicket(f.id) });
                    }}
                  >
                    <X aria-hidden="true" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="tray__acts">
            <button type="button" className="btn btn--ghost btn--sm" disabled={films.length < 2} onClick={() => open({ type: 'compare' })} title={films.length < 2 ? 'Возьмите ещё один билет, чтобы сравнить' : undefined}>
              <Columns2 aria-hidden="true" /> <span className="tray__lbl">Сравнить</span>
            </button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={films.length < 2} onClick={() => open({ type: 'roulette', pool: tickets })}>
              <Dices aria-hidden="true" /> <span className="tray__lbl">Решить за меня</span>
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => open({ type: 'jam' })}>
              <Users aria-hidden="true" /> <span className="tray__lbl">Вместе</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
