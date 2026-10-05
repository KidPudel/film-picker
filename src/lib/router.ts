import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

/**
 * Tiny hash router (GitHub Pages friendly: no server rewrites needed).
 *   #/            → catalog
 *   #/film/:slug  → film page
 *
 * Navigation runs inside a View Transition when supported, so the poster you
 * clicked can fly onto the cinema screen. Scroll position of the catalog is
 * remembered and restored when you come back.
 */

export type Route = { name: 'catalog' } | { name: 'film'; slug: string } | { name: 'notfound' };

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/' || path === '') return { name: 'catalog' };
  const m = path.match(/^\/film\/([a-z0-9-]+)\/?$/);
  if (m) return { name: 'film', slug: m[1] };
  return { name: 'notfound' };
}

let current: Route = parse(window.location.hash);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Film whose poster participates in the shared-element transition. */
export let transitionFilmId: number | null = null;
let catalogScroll = 0;

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  document.documentElement.dataset.motion === 'reduce';

function apply(next: Route) {
  const prev = current;
  if (prev.name === 'catalog') catalogScroll = window.scrollY;
  current = next;
  flushSync(emit);
  window.scrollTo(0, next.name === 'catalog' ? catalogScroll : 0);
}

type VT = { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void> };

function withTransition(next: Route) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => VT };
  if (!doc.startViewTransition || reducedMotion() || document.visibilityState !== 'visible') return apply(next);
  const t = doc.startViewTransition(() => apply(next));
  // A skipped transition (tab hidden, rapid clicks) is harmless — the DOM still updates.
  [t.ready, t.finished, t.updateCallbackDone].forEach((p) => p.catch(() => {}));
}

/** How many in-app entries we pushed — so «back» never leaves the site. */
let depth = 0;

export function navigate(path: string, opts: { filmId?: number } = {}) {
  if (opts.filmId !== undefined) transitionFilmId = opts.filmId;
  depth++;
  history.pushState({ depth }, '', `#${path}`);
  withTransition(parse(`#${path}`));
}

/** Back to wherever the viewer came from inside the app, or to the catalog. */
export function goBack() {
  if (depth > 0) history.back();
  else navigate('/');
}

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('popstate', (e) => {
  depth = (e.state as { depth?: number } | null)?.depth ?? 0;
  withTransition(parse(window.location.hash));
});
// popstate also fires when the hash is edited by hand, so no hashchange listener is needed.

export const useRoute = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );

export const filmHref = (slug: string) => `#/film/${slug}`;
