import type { ExperienceKey, Film } from '../data/types';
import { ENERGY_CEILING, EXPERIENCES, SCALE_TEXT } from '../data/vocab';
import { FRIEND_BY_ID, FRIEND_TAKES } from '../data/social';
import type { Dislike, Dismissal, Shelf, Tonight } from '../store/useStore';
import { finishTime, formatIsoDay, formatRuntime } from './format';

/**
 * The matching engine. It never silently hides a film: every film gets a list
 * of human-readable reasons, and anything with a blocking reason goes to
 * «Почти подходит» with that reason shown — so the viewer always knows why.
 */

export type Tone = 'ok' | 'warn' | 'no';
export interface Reason {
  tone: Tone;
  text: string;
}
export interface Match {
  film: Film;
  fits: boolean;
  score: number;
  reasons: Reason[];
  matchedWants: ExperienceKey[];
}

export interface MatchContext {
  tonight: Tonight;
  dislikes: Dislike[];
  seen: number[];
  shelves: Shelf[];
  now?: Date;
}

export const isTonightActive = (t: Tonight) =>
  t.time !== null ||
  t.energy !== null ||
  t.wants.length > 0 ||
  t.company !== null ||
  t.noExtraCost ||
  t.excludes.length > 0;

export const hasVoiceover = (f: Film) => f.ed.audio.some((a) => /дубляж|Закадровый/i.test(a)) || f.languages[0] === 'русский';

const listLabels = (keys: ExperienceKey[]) => keys.map((k) => EXPERIENCES[k].label).join(', ');

export function matchFilm(film: Film, ctx: MatchContext): Match {
  const { tonight: t, dislikes, seen, shelves } = ctx;
  const now = ctx.now ?? new Date();
  const s = film.ed.scales;
  const reasons: Reason[] = [];
  const ok = (text: string) => reasons.push({ tone: 'ok', text });
  const warn = (text: string) => reasons.push({ tone: 'warn', text });
  const no = (text: string) => reasons.push({ tone: 'no', text });
  let score = 0;

  // ── Availability first: research says cost and access must be clear before evaluating.
  const av = film.ed.availability;
  if (av.kind === 'soon') no(`Выйдет ${formatIsoDay(av.date)} — можно напомнить`);
  if (av.kind === 'premium') (t.noExtraCost ? no : warn)('Нужна подписка «Премиум»');
  if (av.kind === 'rent') (t.noExtraCost ? no : warn)(`Аренда · ${av.price} ₽`);

  // ── Time
  if (typeof t.time === 'number') {
    if (film.runtime <= t.time + 5) {
      ok(`Уложится: ${formatRuntime(film.runtime)}, конец около ${finishTime(film.runtime, now)}`);
      score += 1;
    } else {
      no(`На ${film.runtime - t.time} мин дольше, чем есть времени`);
    }
  }

  // ── Energy → ceilings on emotional load and attention
  if (t.energy === 'low' || t.energy === 'mid') {
    const c = ENERGY_CEILING[t.energy];
    if (s.intensity > c.intensity) no(t.energy === 'low' ? 'Тяжелее, чем хочется сегодня' : 'Слишком тяжело для среднего запаса сил');
    else if (s.attention > c.attention) no(t.energy === 'low' ? 'Потребует много внимания' : 'Требует максимум внимания');
    else {
      ok(t.energy === 'low' ? `Бережно: ${SCALE_TEXT.intensity[s.intensity]}, ${SCALE_TEXT.attention[s.attention]}` : `По силам: ${SCALE_TEXT.intensity[s.intensity]}`);
      score += (c.intensity - s.intensity) * 0.4;
    }
  } else if (t.energy === 'high' && (s.intensity >= 4 || s.attention >= 4)) {
    ok('Для вечера с запасом сил');
    score += 2;
  }

  // ── Wanted experiences (soft, but a total mismatch counts as "другое настроение")
  const matchedWants = t.wants.filter((w) => film.ed.experiences.includes(w));
  if (t.wants.length) {
    if (matchedWants.length) {
      ok(`Есть то, что вы искали: ${listLabels(matchedWants)}`);
      for (const w of matchedWants) score += 3 + (4 - film.ed.experiences.indexOf(w)) * 0.3;
    } else {
      no(`Другое настроение: скорее ${listLabels(film.ed.experiences.slice(0, 2))}`);
    }
  }

  // ── Company
  if (t.company === 'kids') {
    if (film.ageNum <= 6) {
      ok(`Можно смотреть с детьми · ${film.age}`);
      score += 2;
    } else if (film.ageNum <= 12) warn(`${film.age} — скорее для подростков`);
    else no(`${film.age} — не для детей`);
  }
  if (t.company === 'pair' && film.ed.company.pair) score += 0.5;
  if (t.company === 'friends') {
    if (film.ed.company.friends) {
      ok('Будет что обсудить компанией');
      score += 1;
    } else warn('Скорее для камерного просмотра');
  }

  // ── Tonight-only exclusions from free text
  for (const ex of t.excludes) {
    if (ex.kind === 'genre' && film.genres.includes(ex.value)) no(`Вы просили ${ex.label}`);
    if (ex.kind === 'bw' && film.isBW) no('Чёрно-белое — вы просили иначе');
    if (ex.kind === 'subs' && !hasVoiceover(film)) no('Только с субтитрами');
    if (ex.kind === 'heavy' && s.intensity >= 4) no('Тяжёлое — вы просили без этого');
  }

  // ── Lasting dislikes from «Не то»
  for (const d of dislikes) {
    if (d.kind === 'director' && film.directors.includes(d.value)) no(`Вы просили реже: ${d.value}`);
    if (d.kind === 'actor' && film.cast.some((c) => c.name_ru === d.value)) no(`Вы просили реже: ${d.value}`);
    if (d.kind === 'genre' && film.genres.includes(d.value)) no(`Вы просили реже: ${d.value}`);
    if (d.kind === 'bw' && film.isBW) no('Вы просили реже чёрно-белое');
    if (d.kind === 'subs' && !hasVoiceover(film)) no('Только с субтитрами — вы просили реже');
  }

  // ── Personal signals
  if (seen.includes(film.id)) {
    warn('Вы уже смотрели — можно пересмотреть');
    score -= 1.5;
  }
  const shelf = shelves.find((sh) => sh.items.some((i) => i.filmId === film.id));
  if (shelf) {
    ok(`С вашей полки «${shelf.name}»`);
    score += 0.75;
  }
  const rec = FRIEND_TAKES[film.id]?.find((x) => x.recommendsTo);
  if (rec) score += 0.5;
  if (rec && reasons.length < 4) ok(`${FRIEND_BY_ID.get(rec.friend)?.name} советует`);

  score += ((film.ratings.kp?.value ?? 7) - 7) * 0.3;

  return { film, fits: !reasons.some((r) => r.tone === 'no'), score, reasons, matchedWants };
}

export interface Ranked {
  fits: Match[];
  almost: Match[];
  hidden: { match: Match; dismissal: Dismissal }[];
}

export function rankFilms(
  films: Film[],
  ctx: MatchContext,
  dismissed: Record<number, Dismissal>,
  sort: 'fit' | 'runtime' | 'rating',
): Ranked {
  const all = films.map((f, i) => {
    const m = matchFilm(f, ctx);
    m.score -= i * 0.01; // stable editorial order for ties
    return m;
  });
  const cmp = (a: Match, b: Match) => {
    if (sort === 'runtime') return a.film.runtime - b.film.runtime;
    if (sort === 'rating') return (b.film.ratings.kp?.value ?? 0) - (a.film.ratings.kp?.value ?? 0);
    return b.score - a.score;
  };
  const blockers = (m: Match) => m.reasons.filter((r) => r.tone === 'no').length;
  const visible = all.filter((m) => !dismissed[m.film.id]);
  return {
    fits: visible.filter((m) => m.fits).sort(cmp),
    almost: visible.filter((m) => !m.fits).sort((a, b) => blockers(a) - blockers(b) || cmp(a, b)),
    hidden: all.filter((m) => dismissed[m.film.id]).map((match) => ({ match, dismissal: dismissed[match.film.id] })),
  };
}
