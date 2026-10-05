import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import './Controls.css';

/**
 * Segmented control = accessible radiogroup (roving tabindex, arrow keys).
 * Used for spoiler level, theme, view mode, sort, votes.
 */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  hideLabel,
  className = '',
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  hideLabel?: boolean;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));

  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (idx + dir + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className={`seg seg--${size} ${className}`}>
      {!hideLabel && <span className="seg__label">{label}</span>}
      <div role="radiogroup" aria-label={label} className="seg__track" onKeyDown={onKey} style={{ ['--n' as string]: options.length, ['--i' as string]: idx }}>
        <span className="seg__thumb" aria-hidden="true" />
        {options.map((o, i) => (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={i === idx}
            tabIndex={i === idx ? 0 : -1}
            title={o.title}
            className="seg__opt"
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Switch (role=switch) for binary settings like «Без доплат». */
export function Switch({ checked, onChange, children, id }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; id?: string }) {
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch__track" aria-hidden="true">
        <span className="switch__dot" />
      </span>
      <span className="switch__label">{children}</span>
    </button>
  );
}

/** Film-strip meter: 5 frames, filled = level. Text equivalent is always provided. */
export function Meter({ value, max = 5, label, text, accent }: { value: number; max?: number; label: string; text: string; accent?: string }) {
  return (
    <div className="meter" role="img" aria-label={`${label}: ${text}, ${value} из ${max}`}>
      <span className="meter__label" aria-hidden="true">
        {label}
      </span>
      <span className="meter__strip" aria-hidden="true" style={accent ? { ['--meter' as string]: accent } : undefined}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`meter__frame ${i < value ? 'is-on' : ''}`} />
        ))}
      </span>
      <span className="meter__text" aria-hidden="true">
        {text}
      </span>
    </div>
  );
}
