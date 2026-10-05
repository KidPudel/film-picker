import { useRef } from 'react';
import { useUI } from '../store/useUI';
import { Compare } from './Compare';
import { Roulette } from './Roulette';
import { Watch, Paywall } from './Watch';
import { Shelves } from './Shelves';
import { Jam } from './Jam';

/**
 * Single switch for every global overlay (one at a time keeps focus management simple).
 * The last payload is remembered so a dialog keeps its content while it animates out.
 */
export function Overlays() {
  const o = useUI((s) => s.overlay);
  const last = useRef({ watch: 0, paywall: 0, pool: [] as number[], ids: undefined as [number, number] | undefined });
  if (o?.type === 'watch') last.current.watch = o.filmId;
  if (o?.type === 'paywall') last.current.paywall = o.filmId;
  if (o?.type === 'roulette') last.current.pool = o.pool;
  if (o?.type === 'compare') last.current.ids = o.ids;
  const l = last.current;
  return (
    <>
      <Compare open={o?.type === 'compare'} ids={l.ids} />
      <Roulette open={o?.type === 'roulette'} pool={l.pool} />
      <Watch open={o?.type === 'watch'} filmId={l.watch} />
      <Paywall open={o?.type === 'paywall'} filmId={l.paywall} />
      <Shelves open={o?.type === 'shelves'} />
      <Jam open={o?.type === 'jam'} />
    </>
  );
}
