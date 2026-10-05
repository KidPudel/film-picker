import type { Film } from '../data/types';
import type { SpoilerLevel } from '../data/vocab';
import { SCALE_TEXT } from '../data/vocab';
import { FILMS } from '../data/films';
import { finishTime, formatRuntime } from './format';
import { hasVoiceover } from './match';

/**
 * «Подсказчик» — a no-spoiler Q&A over editorial answers.
 * Prototype honesty: answers are authored per film and assembled by rules, not
 * generated. The spoiler level gates what may be said; at every level the plot's
 * twists and ending events stay unsaid.
 */

export type Intent = 'heavy' | 'sleep' | 'company' | 'prereq' | 'ending' | 'similar' | 'audio' | 'length' | 'why';

export const QUESTIONS: { intent: Intent; text: string }[] = [
  { intent: 'heavy', text: 'Насколько это тяжело?' },
  { intent: 'sleep', text: 'Не усну ли я?' },
  { intent: 'company', text: 'С кем лучше смотреть?' },
  { intent: 'prereq', text: 'Нужно что-то знать заранее?' },
  { intent: 'ending', text: 'Какой будет финал?' },
  { intent: 'similar', text: 'На что это похоже?' },
  { intent: 'audio', text: 'Есть озвучка?' },
  { intent: 'why', text: 'Почему стоит посмотреть?' },
];

const INTENT_RULES: [RegExp, Intent][] = [
  [/тяж|груст|страш|жест|насил|депресс|плак|задень|трав/, 'heavy'],
  [/усн|скучн|затянут|медлен|темп|засып/, 'sleep'],
  [/с кем|вдво|дет|ребен|семь|родител|мам|девушк|парн|компани/, 'company'],
  [/знать|заранее|контекст|подготов|понять|история создания/, 'prereq'],
  [/финал|конец|концов|развязк|закончит|умр[её]т|выживет|чем кончит/, 'ending'],
  [/похож|как .*фильм|напомин|аналог|ещ[её] такое|подобн/, 'similar'],
  [/озвуч|дубл|перевод|субтитр|язык|оригинал/, 'audio'],
  [/долг|длин|сколько ид|время|успе|закончу|минут|час/, 'length'],
  [/зачем|почему|стоит ли|чем хорош|в ч[её]м смысл/, 'why'],
];

export function detectIntent(q: string): Intent | null {
  const t = q.toLowerCase().replace(/ё/g, 'е');
  for (const [re, intent] of INTENT_RULES) {
    if (new RegExp(re.source.replace(/\[её\]/g, 'е')).test(t)) return intent;
  }
  return null;
}

export interface Answer {
  text: string;
  /** Present when the spoiler level withheld something. */
  gated?: { need: SpoilerLevel; hint: string };
}

export function answer(film: Film, intent: Intent, level: SpoilerLevel, now = new Date()): Answer {
  const a = film.ed.answers;
  const s = film.ed.scales;
  switch (intent) {
    case 'heavy':
      return { text: `${a.heavy} Эмоциональная нагрузка — ${SCALE_TEXT.intensity[s.intensity]}.` };
    case 'sleep':
      return { text: `${a.sleep} Темп — ${SCALE_TEXT.pace[s.pace]}, внимание — ${SCALE_TEXT.attention[s.attention]}.` };
    case 'company':
      return { text: `${film.ed.company.note} Возрастной рейтинг — ${film.age}.` };
    case 'prereq':
      return { text: a.prereq };
    case 'ending':
      if (level === 0)
        return {
          text: 'Сейчас вы просили ничего не рассказывать о сюжете, поэтому о финале промолчим.',
          gated: { need: 2, hint: 'Поднимите уровень до «Сюжет», чтобы узнать хотя бы тон финала — без событий.' },
        };
      if (level < 3)
        return {
          text: `Без событий и подробностей: финал ${a.endingTone}.`,
          gated: { need: 3, hint: 'На уровне «Всё, кроме финала» расскажем, какое ощущение он оставляет.' },
        };
      return { text: `Финал ${a.endingTone}. ${a.endingMore} Что именно произойдёт — не скажем ни на каком уровне.` };
    case 'similar': {
      const near = nearest(film).map((f) => `«${f.title}»`).join(' и ');
      return { text: `По ощущению: ${a.similar.join('; ')}. В нашем каталоге ближе всего ${near}.` };
    }
    case 'audio':
      return {
        text: `Доступно: ${film.ed.audio.join(', ').toLowerCase()}. ${hasVoiceover(film) ? 'Можно смотреть без субтитров.' : 'Русской озвучки нет — понадобятся субтитры.'}`,
      };
    case 'length':
      return { text: `Фильм идёт ${formatRuntime(film.runtime)}. Если начать сейчас, закончится около ${finishTime(film.runtime, now)}.` };
    case 'why':
      return { text: a.why };
  }
}

/** Two closest films by experience overlap and scale distance. */
export function nearest(film: Film, n = 2): Film[] {
  return FILMS.filter((f) => f.id !== film.id)
    .map((f) => {
      const shared = f.ed.experiences.filter((e) => film.ed.experiences.includes(e)).length;
      const d =
        Math.abs(f.ed.scales.intensity - film.ed.scales.intensity) +
        Math.abs(f.ed.scales.pace - film.ed.scales.pace) +
        Math.abs(f.ed.scales.attention - film.ed.scales.attention);
      return { f, score: shared * 2 - d * 0.7 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.f);
}

/** Alternatives that differ in one clear direction — «то же, но легче/короче…». */
export function alternatives(film: Film): { film: Film; label: string }[] {
  const others = FILMS.filter((f) => f.id !== film.id && f.ed.availability.kind !== 'soon');
  const out: { film: Film; label: string }[] = [];
  const used = new Set<number>();
  const pick = (label: string, cands: Film[], by: (f: Film) => number) => {
    const best = cands.filter((f) => !used.has(f.id)).sort((a, b) => by(a) - by(b))[0];
    if (best) {
      used.add(best.id);
      out.push({ film: best, label });
    }
  };
  const share = (f: Film) => -f.ed.experiences.filter((e) => film.ed.experiences.includes(e)).length;
  pick('Похожее по ощущению', others, (f) => share(f) * 3 + Math.abs(f.ed.scales.intensity - film.ed.scales.intensity));
  pick('Легче', others.filter((f) => f.ed.scales.intensity < film.ed.scales.intensity), (f) => share(f) * 2 - f.ed.scales.intensity * 0.2);
  pick('Короче', others.filter((f) => f.runtime < film.runtime - 10), (f) => share(f) * 2 + f.runtime / 60);
  if (out.length < 3)
    pick('Сильнее', others.filter((f) => f.ed.scales.intensity > film.ed.scales.intensity), (f) => share(f) * 2);
  return out;
}
