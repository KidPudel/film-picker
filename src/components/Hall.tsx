import type { Film } from '../data/types';
import { Poster } from './FilmCase';
import './Hall.css';

/**
 * The cinema hall: the chosen film is projected onto the screen.
 * Lights dim, the lamp flickers once, the screen's colour spills onto the walls
 * and the rim of the seats. All decorative — the poster carries the alt text.
 */

// Seat-back silhouettes for two rows (x centre, width, height) in a 1000×160 box.
const ROWS = [
  { y: 112, h: 52, w: 74, gap: 10, count: 13, offset: 0 },
  { y: 70, h: 40, w: 58, gap: 9, count: 15, offset: 33 },
];

function Seats() {
  return (
    <svg className="hall__seats" viewBox="0 0 1000 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="seat-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="0.12" stopColor="var(--accent)" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[...ROWS].reverse().map((r, ri) => {
        const total = r.count * r.w + (r.count - 1) * r.gap;
        const start = 500 - total / 2 + (ri === 0 ? r.offset : 0);
        return (
          <g key={ri}>
            {Array.from({ length: r.count }, (_, i) => {
              const x = start + i * (r.w + r.gap);
              return (
                <g key={i}>
                  <rect x={x} y={r.y - r.h} width={r.w} height={r.h + 60} rx={r.w * 0.32} className="seat" />
                  <rect x={x} y={r.y - r.h} width={r.w} height={r.h + 60} rx={r.w * 0.32} fill="url(#seat-rim)" />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function Hall({ film }: { film: Film }) {
  return (
    <div className="hall" style={{ ['--accent' as string]: film.ed.accent }}>
      <div className="hall__walls" aria-hidden="true" />
      <div className="hall__curtain hall__curtain--l" aria-hidden="true" />
      <div className="hall__curtain hall__curtain--r" aria-hidden="true" />
      <div className="hall__beam" aria-hidden="true">
        <span className="hall__dust" style={{ left: '46%', top: '58%', animationDelay: '-2s' }} />
        <span className="hall__dust" style={{ left: '53%', top: '44%', animationDelay: '-6s' }} />
        <span className="hall__dust" style={{ left: '49%', top: '70%', animationDelay: '-9s' }} />
        <span className="hall__dust" style={{ left: '57%', top: '62%', animationDelay: '-4s' }} />
        <span className="hall__dust" style={{ left: '42%', top: '50%', animationDelay: '-11s' }} />
      </div>
      <div className="hall__screen">
        <div className="screen__fill" style={{ backgroundImage: `url(${film.poster.src360})` }} aria-hidden="true" />
        <Poster film={film} hero="screen" eager sizes="(max-width: 640px) 40vw, 320px" alt={`Постер фильма «${film.title}»`} className="screen__poster" />
        <div className="screen__lamp" aria-hidden="true" />
        <div className="screen__scan" aria-hidden="true" />
      </div>
      <Seats />
      <div className="hall__dim" aria-hidden="true" />
    </div>
  );
}
