import { useMemo, useState, type ReactNode } from 'react';
import type { Film } from '../data/types';
import { FILM_BY_ID, FILMS } from '../data/films';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { EXPERIENCES, SCALE_TEXT } from '../data/vocab';
import { FRIEND_TAKES } from '../data/social';
import { isTonightActive, matchFilm, hasVoiceover } from '../lib/match';
import { finishTime, formatRuntime, formatScore } from '../lib/format';
import { useNow } from '../lib/hooks';
import { Dialog } from './Overlay';
import { Poster, openFilm } from './Poster';
import { AvailabilityLabel } from './Availability';
import { ToneIcon } from './ReasonIcon';
import './Compare.css';

/**
 * Side-by-side comparison of two films (scope: exactly two — enough to decide,
 * not enough to overwhelm). Rows stay aligned; differences get a plain-words tag.
 */
export function Compare({ open, ids }: { open: boolean; ids?: [number, number] }) {
  const close = useUI((s) => s.close);
  const tickets = useStore((s) => s.tickets);
  const pool = useMemo(() => {
    const base = [...new Set([...(ids ?? []), ...tickets])];
    return base.length >= 2 ? base : FILMS.slice(0, 2).map((f) => f.id);
  }, [ids, tickets]);
  const [pick, setPick] = useState<[number, number] | null>(null);
  const [a, b] = pick ?? [pool[0], pool[1]];
  const A = FILM_BY_ID.get(a)!;
  const B = FILM_BY_ID.get(b)!;

  return (
    <Dialog open={open} onClose={close} title="Сравнение" subtitle="Два фильма рядом — ключевые факты на одних и тех же местах." size="xl">
      {A && B && (
        <div className="cmp">
          <div className="cmp__cols">
            <span />
            {[A, B].map((f, i) => (
              <ColumnHead key={i} film={f} pool={pool} other={i === 0 ? b : a} onChange={(id) => setPick(i === 0 ? [id, b] : [a, id])} />
            ))}
          </div>
          <Rows a={A} b={B} />
        </div>
      )}
    </Dialog>
  );
}

function ColumnHead({ film, pool, other, onChange }: { film: Film; pool: number[]; other: number; onChange: (id: number) => void }) {
  const close = useUI((s) => s.close);
  return (
    <div className="cmp__head" style={{ ['--accent' as string]: film.ed.accent }}>
      <Poster film={film} sizes="120px" className="cmp__poster" />
      <div className="cmp__headtext">
        {pool.length > 2 ? (
          <label className="cmp__select">
            <span className="sr-only">Фильм для сравнения</span>
            <select value={film.id} onChange={(e) => onChange(Number(e.target.value))}>
              {pool
                .filter((id) => id !== other)
                .map((id) => (
                  <option key={id} value={id}>
                    {FILM_BY_ID.get(id)!.title}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          <p className="cmp__title">{film.title}</p>
        )}
        <p className="cmp__sub">
          {film.year}, {film.directors[0]}
        </p>
        <AvailabilityLabel a={film.ed.availability} />
        <button
          type="button"
          className="btn btn--primary btn--sm cmp__choose"
          onClick={(e) => {
            close();
            openFilm(film, e);
          }}
        >
          Выбрать этот
        </button>
      </div>
    </div>
  );
}

function Rows({ a, b }: { a: Film; b: Film }) {
  const now = useNow();
  const tonight = useStore((s) => s.tonight);
  const ctx = { tonight, dislikes: useStore((s) => s.dislikes), seen: useStore((s) => s.seen), shelves: useStore((s) => s.shelves), now };
  const ma = matchFilm(a, ctx);
  const mb = matchFilm(b, ctx);
  const diff = (x: number, y: number) => (x === y ? 0 : x < y ? -1 : 1);

  const row = (label: string, render: (f: Film, i: 0 | 1) => ReactNode, tag?: (i: 0 | 1) => string | null) => (
    <div className="cmp__row" role="row">
      <span className="cmp__label" role="rowheader">
        {label}
      </span>
      {[a, b].map((f, i) => (
        <span key={i} className="cmp__cell" role="cell">
          {render(f, i as 0 | 1)}
          {tag?.(i as 0 | 1) && <span className="cmp__tag">{tag(i as 0 | 1)}</span>}
        </span>
      ))}
    </div>
  );
  const shorter = (i: 0 | 1) => {
    const d = (i === 0 ? 1 : -1) * (b.runtime - a.runtime);
    return d > 5 ? `короче на ${d} мин` : null;
  };
  const lighter = (i: 0 | 1) => (diff(a.ed.scales.intensity, b.ed.scales.intensity) === (i === 0 ? -1 : 1) ? 'легче' : null);
  const easier = (i: 0 | 1) => (diff(a.ed.scales.attention, b.ed.scales.attention) === (i === 0 ? -1 : 1) ? 'проще следить' : null);
  const kp = (f: Film) => f.ratings.kp?.value ?? 0;
  const higher = (i: 0 | 1) => (diff(kp(a), kp(b)) === (i === 0 ? 1 : -1) ? 'выше' : null);

  return (
    <div className="cmp__table" role="table" aria-label={`Сравнение «${a.title}» и «${b.title}»`}>
      {isTonightActive(tonight) &&
        row('Сегодня', (_, i) => {
          const m = i === 0 ? ma : mb;
          const no = m.reasons.find((r) => r.tone === 'no');
          return m.fits ? (
            <span className="cmp__verdict">
              <ToneIcon tone="ok" /> подходит под ваш вечер
            </span>
          ) : (
            <span className="cmp__verdict">
              <ToneIcon tone="no" /> {no?.text}
            </span>
          );
        })}
      {row('Длительность', (f) => `${formatRuntime(f.runtime)}, конец около ${finishTime(f.runtime, now)}`, shorter)}
      {row('Нагрузка', (f) => <Bar v={f.ed.scales.intensity} t={SCALE_TEXT.intensity[f.ed.scales.intensity]} />, lighter)}
      {row('Внимание', (f) => <Bar v={f.ed.scales.attention} t={SCALE_TEXT.attention[f.ed.scales.attention]} />, easier)}
      {row('Темп', (f) => <Bar v={f.ed.scales.pace} t={SCALE_TEXT.pace[f.ed.scales.pace]} />)}
      {row('Юмор', (f) => <Bar v={f.ed.scales.humor} t={SCALE_TEXT.humor[f.ed.scales.humor]} />)}
      {row('Ощущение', (f) => f.ed.experiences.map((e) => EXPERIENCES[e].label).join(', '))}
      {row('Коротко', (f) => f.ed.fitLine)}
      {row('Оценки', (f) => [f.ratings.kp && `КП ${formatScore(f.ratings.kp.value)}`, f.ratings.imdb && `IMDb ${formatScore(f.ratings.imdb.value)}`].filter(Boolean).join(', '), higher)}
      {row('Друзья', (f) => {
        const t = FRIEND_TAKES[f.id];
        return t?.length ? t.map((x) => x.score).join(', ') + ' из 10' : '—';
      })}
      {row('С кем', (f) => [f.age, f.ed.company.kids && 'можно с детьми', f.ed.company.friends && 'для компании'].filter(Boolean).join(', '))}
      {row('Звук', (f) => (hasVoiceover(f) ? 'есть озвучка' : 'только субтитры'))}
    </div>
  );
}

function Bar({ v, t }: { v: number; t: string }) {
  return (
    <span className="cmp__bar">
      <span className="cmp__track" aria-hidden="true">
        <span style={{ width: `${(v / 5) * 100}%` }} />
      </span>
      {t}
    </span>
  );
}
