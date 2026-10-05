import { forwardRef, useRef, type CSSProperties, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { Eye, Library } from 'lucide-react';
import type { Film } from '../data/types';
import type { Match } from '../lib/match';
import { EXPERIENCES, SCALE_TEXT } from '../data/vocab';
import { FRIEND_BY_ID, FRIEND_TAKES } from '../data/social';
import { finishTime, formatRuntime, formatScore, speakRuntime } from '../lib/format';
import { navigate, transitionFilmId } from '../lib/router';
import { useStore, isOnShelf } from '../store/useStore';
import { AvailabilityLabel } from './Availability';
import { NotThisButton, ShelfButton, TicketButton } from './FilmActions';
import './FilmCase.css';

/** Give the clicked poster the shared-element name so it flies onto the screen. */
export function markHero(el: HTMLElement | null) {
  if (!el || document.querySelector('[data-hero="screen"]')) return;
  document.querySelectorAll<HTMLElement>('[data-hero="card"]').forEach((x) => {
    x.style.viewTransitionName = '';
    delete x.dataset.hero;
  });
  el.style.viewTransitionName = 'poster-hero';
  el.dataset.hero = 'card';
}

export function openFilm(film: Film, e?: MouseEvent, posterEl?: HTMLElement | null) {
  if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) return; // let the browser open a new tab
  e?.preventDefault();
  markHero(posterEl ?? null);
  navigate(`/film/${film.slug}`, { filmId: film.id });
}

export const Poster = forwardRef<HTMLImageElement, { film: Film; sizes: string; alt?: string; className?: string; eager?: boolean; style?: CSSProperties; hero?: 'card' | 'screen' }>(
  function Poster({ film, sizes, alt = '', className = '', eager, style, hero }, ref) {
    const isHero = hero === 'screen' || (hero === 'card' && transitionFilmId === film.id);
    return (
      <img
        ref={ref}
        className={`poster ${className}`}
        src={film.poster.src360}
        srcSet={`${film.poster.src360} 360w, ${film.poster.src720} 720w`}
        sizes={sizes}
        alt={alt}
        width={360}
        height={540}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        data-hero={isHero ? hero : undefined}
        style={{
          backgroundImage: `url(${film.poster.lqip})`,
          viewTransitionName: isHero ? 'poster-hero' : undefined,
          ...style,
        }}
      />
    );
  },
);

export function FriendsLine({ film }: { film: Film }) {
  const takes = FRIEND_TAKES[film.id];
  if (!takes?.length) return null;
  return (
    <p className="friends-line">
      <span className="friends-line__faces" aria-hidden="true">
        {takes.slice(0, 3).map((t) => {
          const f = FRIEND_BY_ID.get(t.friend)!;
          return (
            <span key={t.friend} className="face" style={{ ['--h' as string]: f.hue }}>
              {f.name[0]}
            </span>
          );
        })}
      </span>
      <span>
        {takes
          .slice(0, 2)
          .map((t) => `${FRIEND_BY_ID.get(t.friend)!.name} ${t.score}/10`)
          .join(' · ')}
      </span>
    </p>
  );
}

export function FilmCase({ match, now, dim, index = 0 }: { match: Match; now: Date; dim?: boolean; index?: number }) {
  const f = match.film;
  const tonight = useStore((s) => s.tonight);
  const seen = useStore((s) => s.seen.includes(f.id));
  const shelved = useStore((s) => isOnShelf(s.shelves, f.id));
  const av = f.ed.availability;
  const blockers = match.reasons.filter((r) => r.tone === 'no');
  const words = [...match.matchedWants, ...f.ed.experiences.filter((e) => !match.matchedWants.includes(e))].slice(0, 3);
  const timeSet = typeof tonight.time === 'number';
  const href = `#/film/${f.slug}`;
  const posterRef = useRef<HTMLImageElement>(null);

  return (
    <motion.article
      layout="position"
      layoutId={`case-${f.id}`}
      className={`case ${dim ? 'case--dim' : ''}`}
      style={{ ['--accent' as string]: f.ed.accent }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', duration: 0.5, bounce: 0, delay: Math.min(index, 8) * 0.035 }}
      aria-labelledby={`case-title-${f.id}`}
    >
      <a className="case__box" href={href} tabIndex={-1} aria-hidden="true" onClick={(e) => openFilm(f, e, posterRef.current)}>
        <span className="case__spine" />
        <span className="case__frame">
          <Poster ref={posterRef} film={f} hero="card" sizes="(max-width: 640px) 45vw, 240px" className="case__poster" />
          <span className="case__gloss" />
          <span className="case__spot" />
        </span>
        <span className="case__badges">
          {av.kind !== 'included' && <AvailabilityLabel a={av} variant="ribbon" />}
          <span className="case__age">{f.age}</span>
        </span>
        {(seen || shelved) && (
          <span className="case__stamp">
            {seen ? (
              <>
                <Eye aria-hidden="true" /> Смотрено
              </>
            ) : (
              <>
                <Library aria-hidden="true" /> С полки
              </>
            )}
          </span>
        )}
      </a>

      <div className="case__body">
        <h3 className="case__title" id={`case-title-${f.id}`}>
          <a href={href} onClick={(e) => openFilm(f, e, posterRef.current)}>
            {f.title}
          </a>
        </h3>
        <p className="case__meta">
          <span aria-label={speakRuntime(f.runtime)}>{formatRuntime(f.runtime)}</span>
          <span className={`case__finish ${timeSet ? 'is-hot' : ''}`} title="Если начать сейчас">
            → до {finishTime(f.runtime, now)}
          </span>
          <span className="case__year">{f.year}</span>
          {f.ratings.kp && <span className="case__kp" aria-label={`Кинопоиск ${formatScore(f.ratings.kp.value)}`}>КП {formatScore(f.ratings.kp.value)}</span>}
        </p>
        <ul className="words" aria-label="Что даёт фильм">
          {words.map((w) => (
            <li key={w} className={match.matchedWants.includes(w) ? 'is-match' : ''}>
              {EXPERIENCES[w].label}
            </li>
          ))}
        </ul>
        <p className="case__fit">{f.ed.fitLine}</p>
        <FriendsLine film={f} />

        {blockers.length > 0 && (
          <ul className="case__reasons" aria-label="Почему не подходит сегодня">
            {blockers.slice(0, 2).map((r) => (
              <li key={r.text} className="reason reason--no">
                <span className="reason__icon" aria-hidden="true">
                  ✕
                </span>
                {r.text}
              </li>
            ))}
          </ul>
        )}

        <div className="case__foot">
          <AvailabilityLabel a={av} />
          <div className="case__actions">
            <TicketButton film={f} />
            <ShelfButton film={f} />
            <NotThisButton film={f} />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/** Compact comparison table — «Корешки». Real <table> so screen readers can navigate by column. */
export function SpineTable({ matches, now, caption }: { matches: Match[]; now: Date; caption: string }) {
  return (
    <div className="spines-wrap">
      <table className="spines">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Фильм</th>
            <th scope="col">Время</th>
            <th scope="col">Нагрузка</th>
            <th scope="col">Внимание</th>
            <th scope="col">Ощущение</th>
            <th scope="col">Оценки</th>
            <th scope="col">Доступ</th>
            <th scope="col">
              <span className="sr-only">Действия</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <SpineRow key={m.film.id} m={m} now={now} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dots({ v, label }: { v: number; label: string }) {
  return (
    <span className="dots" role="img" aria-label={`${label}, ${v} из 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < v ? 'is-on' : ''} />
      ))}
      <span className="dots__text" aria-hidden="true">
        {label}
      </span>
    </span>
  );
}

function SpineRow({ m, now }: { m: Match; now: Date }) {
  const f = m.film;
  const blockers = m.reasons.filter((r) => r.tone === 'no');
  const thumb = useRef<HTMLImageElement>(null);
  return (
    <motion.tr layout="position" className={`spine ${m.fits ? '' : 'spine--dim'}`} style={{ ['--accent' as string]: f.ed.accent }}>
      <th scope="row" className="spine__film">
        <a href={`#/film/${f.slug}`} onClick={(e) => openFilm(f, e, thumb.current)} className="spine__link">
          <Poster ref={thumb} film={f} hero="card" sizes="48px" className="spine__thumb" />
          <span className="spine__label">
            <span className="spine__title">{f.title}</span>
            <span className="spine__sub">
              <span lang={f.originalLang}>{f.originalTitle}</span> · {f.year}
            </span>
            {blockers[0] && <span className="spine__why">✕ {blockers[0].text}</span>}
          </span>
        </a>
      </th>
      <td className="spine__time">
        <span>{formatRuntime(f.runtime)}</span>
        <span className="spine__finish">до {finishTime(f.runtime, now)}</span>
      </td>
      <td>
        <Dots v={f.ed.scales.intensity} label={SCALE_TEXT.intensity[f.ed.scales.intensity]} />
      </td>
      <td>
        <Dots v={f.ed.scales.attention} label={SCALE_TEXT.attention[f.ed.scales.attention]} />
      </td>
      <td className="spine__words">{f.ed.experiences.slice(0, 2).map((e) => EXPERIENCES[e].label).join(', ')}</td>
      <td className="spine__ratings">
        {f.ratings.kp && <span>КП {formatScore(f.ratings.kp.value)}</span>}
        {f.ratings.imdb && <span>IMDb {formatScore(f.ratings.imdb.value)}</span>}
      </td>
      <td>
        <AvailabilityLabel a={f.ed.availability} />
      </td>
      <td className="spine__actions">
        <TicketButton film={f} />
        <ShelfButton film={f} />
        <NotThisButton film={f} />
      </td>
    </motion.tr>
  );
}
