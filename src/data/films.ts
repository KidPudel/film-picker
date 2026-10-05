import raw from '../../movies-data/movies.json';
import media from './media.generated.json';
import { EDITORIAL } from './editorial';
import type { Film, RawMovie, Still } from './types';
import { formatRawDate, formatMoney } from '../lib/format';

const LANG_TAG: Record<string, string> = {
  французский: 'fr',
  английский: 'en',
  шведский: 'sv',
  якутский: 'sah',
  русский: 'ru',
  итальянский: 'it',
};

const CREW_LABELS: [keyof RawMovie['creators'], string][] = [
  ['screenwriters', 'Сценарий'],
  ['cinematographers', 'Оператор'],
  ['composers', 'Композитор'],
  ['editors', 'Монтаж'],
  ['producers', 'Продюсеры'],
  ['production_companies', 'Производство'],
];

type Described = { palette: string[]; mean: string; lqip: string };
const mediaMeta = media as Record<string, { poster: Described; stills: (Described & { n: number; source: string })[] }>;
const base = import.meta.env.BASE_URL;

/** "1.85:1" → 1.85; anything unparsable falls back to the common 1.85. */
const parseAspect = (s: string) => {
  const m = s.match(/([\d.,]+)\s*:\s*([\d.,]+)/);
  const v = m ? parseFloat(m[1].replace(',', '.')) / parseFloat(m[2].replace(',', '.')) : NaN;
  return Number.isFinite(v) && v > 1 ? v : 1.85;
};

function toFilm(m: RawMovie): Film {
  const id = m.identification.kinopoisk_id;
  const ed = EDITORIAL[id];
  if (!ed) throw new Error(`No editorial entry for film ${id}`);
  const age = m.details.age_ratings[0]?.rating ?? '—';
  const r = m.release;

  const premieres = [
    r.world_premiere && { label: 'Мировая премьера', date: r.world_premiere.date, event: r.world_premiere.event },
    r.russian_premiere && { label: 'В России', date: r.russian_premiere.date, event: r.russian_premiere.event },
    ...(r.additional_releases ?? []).map((a) => ({ label: 'Повторный выпуск', date: a.date, event: a.event })),
  ]
    .filter(Boolean)
    .map((p) => ({ ...p!, date: p!.date ? formatRawDate(p!.date) : null }));

  const finances: Film['finances'] = [];
  const fin = m.finances;
  if (fin?.budget) finances.push({ label: 'Бюджет', value: formatMoney(fin.budget.amount, fin.budget.currency, fin.budget.estimated) });
  if (fin?.worldwide_gross)
    finances.push({ label: 'Сборы в мире', value: formatMoney(fin.worldwide_gross.amount, fin.worldwide_gross.currency, fin.worldwide_gross.estimated) });

  return {
    id,
    slug: ed.slug,
    title: m.identification.title_ru,
    originalTitle: m.identification.title_original,
    originalLang: LANG_TAG[m.details.languages[0]] ?? 'und',
    year: m.identification.year,
    runtime: m.details.runtime_minutes,
    genres: m.details.genres,
    countries: m.details.countries,
    languages: m.details.languages,
    age,
    ageNum: parseInt(age, 10) || 0,
    isBW: m.details.color.startsWith('чёрно'),
    aspect: m.details.aspect_ratio,
    directors: m.creators.directors ?? [],
    cast: m.cast ?? [],
    crew: CREW_LABELS.flatMap(([key, label]) => {
      const people = m.creators[key];
      return Array.isArray(people) && people.length ? [{ label, people }] : [];
    }),
    logline: m.content.logline,
    synopsis: m.content.synopsis,
    themes: m.content.themes,
    mood: m.content.mood,
    visualStyle: m.content.visual_style,
    context: m.context.text,
    facts: m.context.facts.map((f) => f.text),
    awards: m.recognition?.awards ?? [],
    ratings: { kp: m.ratings?.kinopoisk ?? undefined, imdb: m.ratings?.imdb ?? undefined },
    trailerUrl: m.links?.official_trailer?.url,
    poster: {
      src360: `${base}posters/${id}-360.webp`,
      src720: `${base}posters/${id}-720.webp`,
      lqip: mediaMeta[id]?.poster.lqip ?? '',
      mean: mediaMeta[id]?.poster.mean ?? '#1a2236',
      beam: `${base}beam/${id}-poster.webp`,
      palette: mediaMeta[id]?.poster.palette ?? [],
    },
    stills: (mediaMeta[id]?.stills ?? []).map(
      (s): Still => ({
        src640: `${base}stills/${id}-${s.n}-640.webp`,
        src1280: `${base}stills/${id}-${s.n}-1280.webp`,
        beam: `${base}beam/${id}-${s.n}.webp`,
        lqip: s.lqip,
        mean: s.mean,
        palette: s.palette,
        source: s.source,
      }),
    ),
    aspectRatio: parseAspect(m.details.aspect_ratio),
    premieres,
    finances,
    sources: m.sources,
    discrepancies: m.completeness.discrepancies.map((d) => d.note),
    missing: m.completeness.missing.map((d) => d.reason),
    ed,
  };
}

/** Editorial order = the "afisha" order shown before the viewer tunes anything. */
const ORDER = [714248, 1040690, 1347315, 425, 677566, 5237750, 425400, 1259195, 225011, 6553389];

export const FILMS: Film[] = (raw as unknown as { movies: RawMovie[] }).movies
  .map(toFilm)
  .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

export const FILM_BY_ID = new Map(FILMS.map((f) => [f.id, f]));
export const FILM_BY_SLUG = new Map(FILMS.map((f) => [f.slug, f]));

export const SOURCE_LABELS: Record<string, string> = {
  kp: 'Кинопоиск',
  imdb: 'IMDb',
};
