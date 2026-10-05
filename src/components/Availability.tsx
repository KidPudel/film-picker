import { Bell, Check, Crown, KeyRound } from 'lucide-react';
import type { Availability as Av } from '../data/types';
import { formatIsoDay } from '../lib/format';
import './Availability.css';

/** Text + icon label so status never relies on colour alone. */
export function availabilityText(a: Av): string {
  switch (a.kind) {
    case 'included':
      return 'В подписке';
    case 'premium':
      return 'Премиум';
    case 'rent':
      return `Аренда, ${a.price} ₽`;
    case 'soon':
      return `Скоро, с ${formatIsoDay(a.date)}`;
  }
}

const SHORT = { included: 'В подписке', premium: 'Премиум', rent: 'Аренда', soon: 'Скоро' };
const ICON = { included: Check, premium: Crown, rent: KeyRound, soon: Bell };

/**
 * inline — the full label (price, date) next to facts;
 * cover  — a short tag on the poster itself, so access is known before reading anything else.
 */
export function AvailabilityLabel({ a, variant = 'inline' }: { a: Av; variant?: 'inline' | 'cover' }) {
  const Icon = ICON[a.kind];
  return (
    <span className={`avail avail--${a.kind} avail--${variant}`}>
      <Icon aria-hidden="true" />
      {variant === 'cover' ? SHORT[a.kind] : availabilityText(a)}
    </span>
  );
}
