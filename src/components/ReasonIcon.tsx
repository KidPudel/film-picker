import { CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import type { Tone } from '../lib/match';

const ICON = { ok: CircleCheck, warn: CircleAlert, no: CircleX };
const SPOKEN = { ok: 'Подходит: ', warn: 'Учтите: ', no: 'Не подходит: ' };

/** A reason line: drawn icon + text. Status is never carried by colour alone. */
export function Reason({ tone, text }: { tone: Tone; text: string }) {
  const Icon = ICON[tone];
  return (
    <li className={`reason reason--${tone}`}>
      <Icon className="reason__icon" aria-hidden="true" />
      <span>
        <span className="sr-only">{SPOKEN[tone]}</span>
        {text}
      </span>
    </li>
  );
}
