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
      return `Аренда · ${a.price} ₽`;
    case 'soon':
      return `Скоро · с ${formatIsoDay(a.date)}`;
  }
}

const ICON = { included: Check, premium: Crown, rent: KeyRound, soon: Bell };

export function AvailabilityLabel({ a, variant = 'inline' }: { a: Av; variant?: 'inline' | 'ribbon' }) {
  const Icon = ICON[a.kind];
  return (
    <span className={`avail avail--${a.kind} avail--${variant}`}>
      <Icon aria-hidden="true" />
      {availabilityText(a)}
    </span>
  );
}
