import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, Library } from 'lucide-react';
import type { Film } from '../data/types';
import type { Match } from '../lib/match';
import { EXPERIENCES } from '../data/vocab';
import { finishTime, formatClock, formatIsoDay, formatRuntime, speakRuntime } from '../lib/format';
import { useStore } from '../store/useStore';
import { useProjector } from '../store/useProjector';
import { useMediaQuery } from '../lib/hooks';
import { AvailabilityLabel } from './Availability';
import { NotThisButton, ShelfButton, TicketButton } from './FilmActions';
import { Poster, filmFrame, openFilm } from './Poster';
import { Reason } from './ReasonIcon';
import './Schedule.css';

/**
 * «Афиша на вечер»: a wall of posters, each with tonight's session printed
 * beneath it. The session bar is drawn to scale on one shared clock (now →
 * the end of the film), so a film that overruns the time you have visibly
 * crosses your line. Cards in a row share subgrid rows: the same fact sits at
 * the same height on every card, so films compare without remembering them.
 */

const SETTLE = 5; // minutes to settle in before the film starts

export function useEvening(now: Date) {
  const time = useStore((s) => s.tonight.time);
  const budget = typeof time === 'number' ? time : null;
  const span = Math.max(180, (budget ?? 0) + 30);
  return { budget, span, now };
}

export function SessionBar({ film, now, span, budget, dim }: { film: Film; now: Date; span: number; budget: number | null; dim?: boolean }) {
  const a = film.ed.availability;
  if (a.kind === 'soon') {
    return (
      <div className="session session--soon">
        <p className="session__soon">Выйдет {formatIsoDay(a.date)}</p>
        <p className="session__meta">
          <span aria-label={speakRuntime(film.runtime)}>{formatRuntime(film.runtime)}</span>
        </p>
      </div>
    );
  }
  const end = film.runtime + SETTLE;
  const endPct = Math.min(100, (end / span) * 100);
  const over = budget !== null && end > budget + SETTLE;
  const cut = over ? ((budget! + SETTLE) / span) * 100 : endPct;
  return (
    <div className={`session ${dim ? 'session--dim' : ''}`}>
      <p className="session__meta">
        <span className="session__end">
          до <time>{finishTime(film.runtime, now)}</time>
        </span>
        <span className="session__runtime" aria-label={speakRuntime(film.runtime)}>
          {formatRuntime(film.runtime)}
        </span>
      </p>
      <div className="session__track" aria-hidden="true">
        <span className="session__fill" style={{ transform: `scaleX(${cut / 100})` }} />
        {over && <span className="session__over" style={{ left: `${cut}%`, width: `${endPct - cut}%` }} />}
        {budget !== null && <span className="session__budget" style={{ left: `${((budget + SETTLE) / span) * 100}%` }} />}
      </div>
    </div>
  );
}

export function FilmCard({ match: m, now, span, budget, dim }: { match: Match; now: Date; span: number; budget: number | null; dim?: boolean }) {
  const f = m.film;
  const seen = useStore((s) => s.seen.includes(f.id));
  const shelf = useStore((s) => s.shelves.find((sh) => sh.items.some((i) => i.filmId === f.id)));
  const blockers = m.reasons.filter((r) => r.tone === 'no');
  const words = [...m.matchedWants, ...f.ed.experiences.filter((e) => !m.matchedWants.includes(e))].slice(0, 3);
  const href = `#/film/${f.slug}`;
  const posterRef = useRef<HTMLImageElement>(null);
  const av = f.ed.availability;

  return (
    <motion.li
      layout="position"
      data-film={f.id}
      className={`fcard ${dim ? 'fcard--dim' : ''}`}
      style={{ ['--accent' as string]: f.ed.accent }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      transition={{ layout: { type: 'spring', duration: 0.45, bounce: 0 }, opacity: { duration: 0.2 } }}
    >
      <article className="fcard__in" aria-labelledby={`t-${f.id}`}>
        <a className="fcard__poster" href={href} tabIndex={-1} aria-hidden="true" onClick={(e) => openFilm(f, e, posterRef.current)}>
          <Poster ref={posterRef} film={f} hero="card" sizes="(max-width: 640px) 46vw, (max-width: 1100px) 30vw, 250px" />
          {av.kind !== 'included' && <AvailabilityLabel a={av} variant="cover" />}
          {(seen || shelf) && (
            <span className="fcard__stamp">
              {seen ? <Eye aria-hidden="true" /> : <Library aria-hidden="true" />}
              {seen ? 'Смотрено' : 'С полки'}
            </span>
          )}
        </a>

        <h3 id={`t-${f.id}`} className="fcard__title">
          <a href={href} onClick={(e) => openFilm(f, e, posterRef.current)}>
            {f.title}
          </a>
        </h3>

        <p className="fcard__sub">
          {f.year}, {f.directors.join(', ')}, <span className="fcard__age">{f.age}</span>
          {shelf && !seen && <span className="sr-only">. Сохранено на полке «{shelf.name}»</span>}
          {seen && <span className="sr-only">. Уже смотрено</span>}
          {av.kind === 'included' && <span className="sr-only">. В подписке</span>}
        </p>

        <SessionBar film={f} now={now} span={span} budget={budget} dim={dim} />

        <ul className="words fcard__words" aria-label="Что даёт фильм">
          {words.map((w) => (
            <li key={w} className={m.matchedWants.includes(w) ? 'is-match' : ''}>
              {EXPERIENCES[w].label}
              {m.matchedWants.includes(w) && <span className="sr-only"> — вы это искали</span>}
            </li>
          ))}
        </ul>

        <div className="fcard__why">
          {blockers.length > 0 ? (
            <ul className="reasons fcard__reasons" aria-label="Почему не подходит сегодня">
              {blockers.slice(0, 2).map((r) => (
                <Reason key={r.text} tone="no" text={r.text} />
              ))}
            </ul>
          ) : (
            <p className="fcard__fit">{f.ed.fitLine}</p>
          )}
        </div>

        <div className="fcard__acts">
          <TicketButton film={f} />
          <ShelfButton film={f} />
          <NotThisButton film={f} />
        </div>
      </article>
    </motion.li>
  );
}

/**
 * The wall hands its light to the projector: the film you point at (or, on
 * touch screens, the one in the middle of the screen) colours the whole hall.
 */
function useLightFollows(listRef: React.RefObject<HTMLOListElement | null>, matches: Match[]) {
  const touch = useMediaQuery('(hover: none)');
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const byId = new Map(matches.map((m) => [String(m.film.id), m.film]));
    const p = useProjector.getState();
    const light = (el: Element | null) => {
      const id = (el?.closest('[data-film]') as HTMLElement | null)?.dataset.film;
      const film = id ? byId.get(id) : undefined;
      if (film) p.setPreview(filmFrame(film));
    };
    if (!touch) {
      const over = (e: Event) => light(e.target as Element);
      const leave = () => p.setPreview(null);
      const out = (e: FocusEvent) => {
        if (!list.contains(e.relatedTarget as Node)) p.setPreview(null);
      };
      list.addEventListener('pointerover', over);
      list.addEventListener('focusin', over);
      list.addEventListener('pointerleave', leave);
      list.addEventListener('focusout', out);
      return () => {
        list.removeEventListener('pointerover', over);
        list.removeEventListener('focusin', over);
        list.removeEventListener('pointerleave', leave);
        list.removeEventListener('focusout', out);
      };
    }
    // Touch: the poster crossing the middle of the viewport is "in the light".
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) light(hit.target);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.5, 1] },
    );
    list.querySelectorAll('[data-film]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [listRef, matches, touch]);
}

/** Legend for the session bars: what "now" is and where your time ends. */
export function SessionLegend({ now }: { now: Date }) {
  const { budget } = useEvening(now);
  const until = budget ? formatClock(new Date(now.getTime() + (budget + SETTLE) * 60_000)) : null;
  return (
    <p className="legend">
      <span className="legend__item">
        <span className="legend__bar" aria-hidden="true" />
        фильм, если начать сейчас, в <time>{formatClock(now)}</time>
      </span>
      {until && (
        <span className="legend__item">
          <span className="legend__budget" aria-hidden="true" />
          ваше время до <time>{until}</time>
        </span>
      )}
    </p>
  );
}

export function Schedule({ matches, now, dim, label }: { matches: Match[]; now: Date; dim?: boolean; label: string }) {
  const { span, budget } = useEvening(now);
  const ref = useRef<HTMLOListElement>(null);
  useLightFollows(ref, matches);
  return (
    <ol className="wall" ref={ref} aria-label={label}>
      <AnimatePresence initial={false} mode="popLayout">
        {matches.map((m) => (
          <FilmCard key={m.film.id} match={m} now={now} span={span} budget={budget} dim={dim} />
        ))}
      </AnimatePresence>
    </ol>
  );
}
