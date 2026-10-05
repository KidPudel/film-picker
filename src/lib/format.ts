const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** plural(5, ['фильм', 'фильма', 'фильмов']) → 'фильмов' */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export const countFilms = (n: number) => `${n} ${plural(n, ['фильм', 'фильма', 'фильмов'])}`;

/** 93 → '1 ч 33 мин', 85 → '1 ч 25 мин', 45 → '45 мин' */
export function formatRuntime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} мин`;
  return m ? `${h} ч ${String(m).padStart(2, '0')} мин` : `${h} ч`;
}

/** Spoken variant for screen readers: '1 час 33 минуты'. */
export function speakRuntime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hs = h ? `${h} ${plural(h, ['час', 'часа', 'часов'])}` : '';
  const ms = m ? `${m} ${plural(m, ['минута', 'минуты', 'минут'])}` : '';
  return [hs, ms].filter(Boolean).join(' ');
}

export const formatClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** When the film ends if started now (+ a few minutes to settle in). Rounded to 5 minutes. */
export function finishTime(runtime: number, now = new Date(), settle = 5): string {
  const end = new Date(now.getTime() + (runtime + settle) * 60_000);
  end.setMinutes(Math.ceil(end.getMinutes() / 5) * 5, 0, 0);
  return formatClock(end);
}

/** "17052025" → "17 мая 2025" */
export function formatRawDate(s: string): string {
  const d = parseInt(s.slice(0, 2), 10);
  const m = parseInt(s.slice(2, 4), 10);
  return `${d} ${MONTHS_GEN[m - 1]} ${s.slice(4)}`;
}

/** "2026-10-17" → "17 октября" */
export function formatIsoDay(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_GEN[m - 1]}`;
}

export function formatToday(now = new Date()): string {
  const day = now.toLocaleDateString('ru-RU', { weekday: 'long' });
  return `${day}, ${now.getDate()} ${MONTHS_GEN[now.getMonth()]}`;
}

export function formatMoney(amount: number, currency: string, estimated: boolean): string {
  const sign = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'RUB' ? '₽' : `${currency} `;
  const v =
    amount >= 1_000_000
      ? `${(amount / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`
      : `${Math.round(amount / 1000).toLocaleString('ru-RU')} тыс.`;
  return `${currency === 'RUB' ? `${v} ${sign}` : `${sign}${v}`}${estimated ? ' (оценка)' : ''}`;
}

export const formatScore = (v: number) => v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatVotes(n: number, approx: boolean): string {
  const v = n >= 1000 ? `${Math.round(n / 1000).toLocaleString('ru-RU')} тыс.` : String(n);
  return `${approx ? '≈ ' : ''}${v} ${plural(n >= 1000 ? 5 : n, ['оценка', 'оценки', 'оценок'])}`;
}

/** The "evening" a moment belongs to: nights until 5:00 count as the previous day. */
export function eveningKey(now = new Date()): string {
  const d = new Date(now.getTime() - 5 * 3600_000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 17) return 'Добрый день';
  if (h >= 17 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}
