import { forwardRef, type CSSProperties, type MouseEvent } from 'react';
import type { Film } from '../data/types';
import { FRIEND_BY_ID, FRIEND_TAKES } from '../data/social';
import { navigate, transitionFilmId } from '../lib/router';
import { useProjector } from '../store/useProjector';

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

/** Open a film: the light warps toward the screen and the poster flies there. */
export function openFilm(film: Film, e?: MouseEvent, posterEl?: HTMLElement | null) {
  if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) return; // let the browser open a new tab
  e?.preventDefault();
  markHero(posterEl ?? null);
  const p = useProjector.getState();
  p.setFrame({ image: film.poster.beam, mean: film.poster.mean, accent: film.ed.accent });
  p.warp();
  navigate(`/film/${film.slug}`, { filmId: film.id });
}

/** The light a film casts: its first frame, or the poster when there are no frames. */
export const filmFrame = (f: Film) =>
  f.stills[0]
    ? { image: f.stills[0].beam, mean: f.stills[0].mean, accent: f.ed.accent }
    : { image: f.poster.beam, mean: f.poster.mean, accent: f.ed.accent };

export const Poster = forwardRef<
  HTMLImageElement,
  { film: Film; sizes: string; alt?: string; className?: string; eager?: boolean; style?: CSSProperties; hero?: 'card' | 'screen' }
>(function Poster({ film, sizes, alt = '', className = '', eager, style, hero }, ref) {
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
        backgroundSize: 'cover',
        viewTransitionName: isHero ? 'poster-hero' : undefined,
        ...style,
      }}
    />
  );
});

/** Demo friends' scores, short form. */
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
          .join(', ')}
      </span>
      <span className="demo-tag">демо</span>
    </p>
  );
}
