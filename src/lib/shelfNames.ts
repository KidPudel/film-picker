import type { Film } from '../data/types';

/**
 * Suggests names for a new shelf from what the films have in common, the
 * reason the viewer gave for saving, and the season. Returns up to 3 unique names.
 */
const MONTH_EVENINGS = [
  'Январские вечера', 'Февральские вечера', 'Мартовские вечера', 'Апрельские вечера',
  'Майские вечера', 'Летние вечера', 'Летние вечера', 'Августовские ночи',
  'Сентябрьские вечера', 'Осенние вечера', 'Ноябрьская хандра', 'Под Новый год',
];

const REASON_NAMES: Record<string, string> = {
  'Посоветовали': 'Советы друзей',
  'Красивый визуал': 'Просто красиво',
  'Посмотреть вдвоём': 'На вечер вдвоём',
  'Когда будут силы': 'Когда будут силы',
  'Важная тема': 'Важное кино',
  'Любимый режиссёр': 'Авторское кино',
};

export function suggestShelfNames(films: Film[], reason?: string, now = new Date()): string[] {
  const out: string[] = [];
  const all = (p: (f: Film) => boolean) => films.length > 0 && films.every(p);
  const has = (k: string) => (f: Film) => f.ed.experiences.includes(k as never);

  if (reason && REASON_NAMES[reason]) out.push(REASON_NAMES[reason]);
  if (all((f) => f.genres.includes('документальный'))) out.push('Документальное на вечер');
  if (all((f) => f.isBW)) out.push('Чёрно-белая классика');
  if (all((f) => f.ed.company.kids)) out.push('Смотреть с детьми');
  if (all((f) => f.ed.scales.intensity >= 4)) out.push('Когда будут силы');
  if (all(has('warm'))) out.push('Когда нужно тепло');
  if (all(has('beauty'))) out.push('Красота кадра');
  if (all(has('think'))) out.push('Пища для ума');
  if (all(has('magic'))) out.push('Немного волшебства');
  if (all(has('cinephile'))) out.push('Кино о кино');
  if (all((f) => f.runtime <= 100)) out.push('Коротко и метко');
  if (all((f) => f.year < 1980)) out.push('Золотая классика');
  out.push(MONTH_EVENINGS[now.getMonth()]);
  out.push('Обязательно посмотреть');

  return [...new Set(out)].slice(0, 3);
}
