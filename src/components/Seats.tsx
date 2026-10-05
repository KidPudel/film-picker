import { useEffect, useRef } from 'react';
import { useProjector } from '../store/useProjector';
import './Seats.css';

/**
 * The row of velvet seats in front of you. The projector renders them in the
 * same pass as the light (so their sheen takes the beam's colours); this
 * element only reserves the band and tells the projector where it is.
 * Without WebGL a quiet silhouette stands in. Decorative.
 */
export function Seats({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const setSeats = useProjector((s) => s.setSeats);
  useEffect(() => {
    setSeats(ref.current);
    return () => setSeats(null);
  }, [setSeats]);
  return (
    <div ref={ref} className={`seats ${className}`} aria-hidden="true">
      <svg className="seats__fallback" viewBox="0 0 1600 200" preserveAspectRatio="xMidYMax slice">
        {Array.from({ length: 9 }, (_, i) => {
          const w = 196;
          const x = 800 - w / 2 + (i - 4) * (w + 12);
          return <path key={i} d={`M${x},220 L${x},92 Q${x},48 ${x + 48},46 L${x + w - 48},46 Q${x + w},48 ${x + w},92 L${x + w},220 Z`} />;
        })}
      </svg>
    </div>
  );
}
