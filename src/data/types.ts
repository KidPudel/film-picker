// ─── Raw dataset (movies-data/movies.json) ────────────────────────────────
// Only the fields the app reads are typed. Dates come as "DDMMYYYY" strings.

export interface RawPerson {
  name_ru: string;
  name_original: string | null;
  role: string | null;
  participation_type: string;
}

export interface RawRating {
  value: number;
  scale: number;
  votes: number;
  votes_approximate: boolean;
  checked_on: string;
  source_ids: string[];
}

export interface RawAward {
  year: number;
  event: string;
  category: string;
  recipient: string | null;
  result: 'win' | 'nomination' | string;
}

export interface RawRelease {
  date: string | null;
  year: number | null;
  event: string;
  release_type: string;
}

export interface RawMovie {
  identification: {
    kinopoisk_id: number;
    kinopoisk_url: string;
    imdb_id: string;
    imdb_url: string;
    title_ru: string;
    title_original: string;
    alternative_titles: string[] | null;
    year: number;
    film_type: string;
  };
  details: {
    countries: string[];
    languages: string[];
    genres: string[];
    runtime_minutes: number;
    age_ratings: { country: string; rating: string }[];
    color: string;
    aspect_ratio: string;
  };
  creators: {
    directors: string[] | null;
    screenwriters: string[] | null;
    producers: string[] | null;
    cinematographers: string[] | null;
    composers: string[] | null;
    editors: string[] | null;
    production_companies: string[] | null;
    source_material: string | null;
  };
  cast: RawPerson[] | null;
  content: {
    logline: string;
    synopsis: string;
    themes: string[];
    mood: string;
    visual_style: string;
  };
  context: { text: string; facts: { text: string; source_ids: string[] }[] };
  release: {
    world_premiere: RawRelease | null;
    russian_premiere: RawRelease | null;
    additional_releases: RawRelease[] | null;
  };
  recognition: { awards: RawAward[] | null } | null;
  finances: {
    budget?: { amount: number; currency: string; estimated: boolean } | null;
    worldwide_gross?: { amount: number; currency: string; estimated: boolean } | null;
  } | null;
  ratings: { kinopoisk?: RawRating | null; imdb?: RawRating | null } | null;
  links: { official_trailer?: { url: string; link_type: string; language: string } | null } | null;
  poster: { path: string; width: number; height: number };
  sources: { id: string; url: string; title: string; sections: string[]; accessed_on: string }[];
  completeness: {
    missing: { field: string; status: string; reason: string }[];
    discrepancies: { field: string; note: string }[];
  };
}

// ─── Editorial layer (src/data/editorial.ts) ──────────────────────────────
// Authored by us: everything a viewer needs to judge "does this fit tonight".

/** What a film gives you. Shown as floating words; the wantable ones drive the tuner. */
export type ExperienceKey =
  | 'warm'
  | 'humor'
  | 'calm'
  | 'magic'
  | 'beauty'
  | 'absorb'
  | 'think'
  | 'catharsis'
  | 'discover'
  | 'nostalgia'
  | 'discuss'
  | 'cinephile'
  | 'tension';

export type Availability =
  | { kind: 'included' }
  | { kind: 'premium' }
  | { kind: 'rent'; price: number }
  | { kind: 'soon'; date: string /* ISO yyyy-mm-dd */ };

/** 1 = least, 5 = most. Humor may be 0. */
export interface Scales {
  pace: number; // 1 неспешно … 5 динамично
  intensity: number; // эмоциональная нагрузка
  attention: number; // сколько внимания требует
  humor: number;
}

export interface Editorial {
  slug: string;
  accent: string;
  fitLine: string;
  experiences: ExperienceKey[];
  scales: Scales;
  goodWhen: string[];
  skipIf: string[];
  company: { pair: boolean; friends: boolean; kids: boolean; note: string };
  contentNotes: string[];
  availability: Availability;
  audio: string[];
  answers: {
    heavy: string;
    prereq: string;
    sleep: string;
    endingTone: string;
    endingMore: string;
    similar: string[];
    why: string;
  };
}

// ─── App model ─────────────────────────────────────────────────────────────

export interface Film {
  id: number;
  slug: string;
  title: string;
  originalTitle: string;
  /** BCP-47 tag for the original title so screen readers pronounce it right. */
  originalLang: string;
  year: number;
  runtime: number;
  genres: string[];
  countries: string[];
  languages: string[];
  age: string;
  ageNum: number;
  isBW: boolean;
  aspect: string;
  directors: string[];
  cast: RawPerson[];
  crew: { label: string; people: string[] }[];
  logline: string;
  synopsis: string;
  themes: string[];
  mood: string;
  visualStyle: string;
  context: string;
  facts: string[];
  awards: RawAward[];
  ratings: { kp?: RawRating; imdb?: RawRating };
  trailerUrl?: string;
  poster: { src360: string; src720: string; lqip: string };
  premieres: { label: string; date: string | null; event: string }[];
  finances: { label: string; value: string; note?: string }[];
  sources: RawMovie['sources'];
  discrepancies: string[];
  missing: string[];
  ed: Editorial;
}
