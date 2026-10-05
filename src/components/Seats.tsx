import { useId } from 'react';
import './Seats.css';

/**
 * Rows of red velvet seat backs in perspective. The tops catch the projector
 * light: `lightX` (0..1) is where the beam comes from, `rim` its colour.
 * Decorative; drawn once as SVG.
 */
const ROWS = [
  { y: 150, h: 64, w: 92, gap: 10, shift: 46 },
  { y: 205, h: 92, w: 136, gap: 14, shift: 0 },
  { y: 300, h: 150, w: 214, gap: 20, shift: 107 },
];

export function Seats({ lightX = 0.62, rim = '#cfefff', className = '' }: { lightX?: number; rim?: string; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const W = 1600;
  return (
    <svg className={`seats ${className}`} viewBox={`0 0 ${W} 300`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`v-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a1124" />
          <stop offset="0.28" stopColor="#4a0814" />
          <stop offset="1" stopColor="#090103" />
        </linearGradient>
        <linearGradient id={`r-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={rim} stopOpacity="0.85" />
          <stop offset="0.1" stopColor={rim} stopOpacity="0.18" />
          <stop offset="0.3" stopColor={rim} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`s-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`f-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      {ROWS.map((r, ri) => {
        const count = Math.ceil(W / (r.w + r.gap)) + 2;
        return (
          <g key={ri}>
            {Array.from({ length: count }, (_, i) => {
              const x = -r.shift + i * (r.w + r.gap);
              const cx = (x + r.w / 2) / W;
              // Seats nearer the beam catch more light.
              const lit = Math.max(0.12, 1 - Math.abs(cx - lightX) * 1.6) * (0.55 + ri * 0.22);
              const top = r.y - r.h;
              const rx = r.w * 0.22;
              return (
                <g key={i}>
                  <rect x={x} y={top} width={r.w} height={r.h + 120} rx={rx} fill={`url(#v-${uid})`} />
                  <rect x={x} y={top} width={r.w} height={r.h + 120} rx={rx} fill={`url(#r-${uid})`} opacity={lit} />
                  <ellipse cx={x + r.w * 0.5} cy={top + r.h * 0.34} rx={r.w * 0.34} ry={r.h * 0.07} fill={`url(#s-${uid})`} opacity={lit * 0.55} />
                </g>
              );
            })}
            <rect x="0" y={r.y - r.h * 0.2} width={W} height={r.h * 0.8} fill={`url(#f-${uid})`} />
          </g>
        );
      })}
    </svg>
  );
}
