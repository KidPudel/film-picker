import type { ExperienceKey } from '../data/types';
import type { CompanyValue, EnergyValue, TimeValue } from '../data/vocab';
import type { Exclusion, Tonight } from '../store/useStore';

/**
 * Understands short Russian phrases like «что-то тёплое, но не комедию, часа на полтора».
 * Rule-based on purpose: predictable, instant, works offline on GitHub Pages.
 * Returns a patch for Tonight plus human-readable chips of what was understood,
 * so the viewer can see (and correct) the interpretation.
 */

export interface Parsed {
  patch: Partial<Tonight>;
  understood: string[];
}

const WANT_RULES: [RegExp, ExperienceKey, string][] = [
  [/т[её]пл|уют|добр|нежн|светл|душевн/, 'warm', 'тепло'],
  [/смешн|посмеят|комеди|юмор|весел|улыб|ржать/, 'humor', 'юмор'],
  [/спокойн|неспешн|медленн|тих|выдохнуть|расслаб/, 'calm', 'спокойно'],
  [/сказ|волшеб|чудо|мульт|анимац|фэнтез|легенд/, 'magic', 'волшебство'],
  [/красив|эстет|визуал|кадр|картинк/, 'beauty', 'красота кадра'],
  [/затян|оторват|захват|интриг|детектив|загадк|держит/, 'absorb', 'захватывающее'],
  [/подума|задума|умн|философ|смысл|глубок/, 'think', 'пища для ума'],
  [/плак|сл[её]з|сильн|катарс|эмоци|тронет|трогат/, 'catharsis', 'сильные чувства'],
  [/документ|узнать|реальн|правд|познават|новое/, 'discover', 'узнать новое'],
];

const NEGATIONS: [RegExp, Exclusion | { want: ExperienceKey; label: string }][] = [
  [/(не|без)\s+(комеди|смешн|юмор)/, { kind: 'genre', value: 'комедия', label: 'без комедий' }],
  [/(не|без)\s+(документ)/, { kind: 'genre', value: 'документальный', label: 'без документального' }],
  [/(не|без)\s+(мульт|анимац)/, { kind: 'genre', value: 'анимация', label: 'без анимации' }],
  [/(не|без)\s+(драм)/, { kind: 'genre', value: 'драма', label: 'без драм' }],
  [/(не|без)\s+(ч[её]рно)/, { kind: 'bw', label: 'не чёрно-белое' }],
  [/(не|без)\s+(субтитр)/, { kind: 'subs', label: 'без субтитров' }],
  [/(не|без)\s+(тяж[её]л|груст|депресс|жест|насили|страш)/, { kind: 'heavy', label: 'без тяжёлого' }],
];

export function parseTonight(input: string): Parsed {
  let text = ` ${input.toLowerCase().replace(/ё/g, 'е')} `;
  const patch: Partial<Tonight> = {};
  const understood: string[] = [];
  const excludes: Exclusion[] = [];

  // 1. Negations first, then cut them out so «не комедию» doesn't count as «комедию».
  for (const [re, ex] of NEGATIONS) {
    const m = text.match(new RegExp(re.source.replace(/ё/g, 'е').replace(/\[её\]/g, 'е')));
    if (m) {
      excludes.push(ex as Exclusion);
      understood.push((ex as Exclusion).label);
      text = text.replace(m[0], ' ');
    }
  }
  if (excludes.length) patch.excludes = excludes;

  const has = (re: RegExp) => new RegExp(re.source.replace(/\[её\]/g, 'е')).test(text);

  // 2. Time
  let time: TimeValue | undefined;
  if (has(/два с половин|2[.,]5|2 с половин|долг|длинн|весь вечер|не спешу|сколько угодно/)) time = has(/весь вечер|сколько угодно|не спешу/) ? 'evening' : 155;
  else if (has(/полтор|1[.,]5|час и|90|коротк|недолг|быстр/)) time = 95;
  else if (has(/два час|2 час|двух час|пару час/)) time = 125;
  if (time) {
    patch.time = time;
    understood.push(time === 95 ? 'около полутора часов' : time === 125 ? 'около двух часов' : time === 155 ? 'два с половиной часа' : 'весь вечер');
  }

  // 3. Energy
  let energy: EnergyValue | undefined;
  if (has(/устал|выжат|без сил|нет сил|тяжелый день|тяжелого дня|лег[кч]|ненапряж|отдохн|фоном|вымот|сонн/)) energy = 'low';
  else if (has(/серьезн|сложн|мощн|сильное кино|есть силы|бодр/)) energy = 'high';
  if (energy) {
    patch.energy = energy;
    understood.push(energy === 'low' ? 'сил мало' : 'сил много');
  }

  // 4. Company
  let company: CompanyValue | undefined;
  if (has(/с детьми|ребен|сыном|дочк|детск|с семьей|всей семьей|с племянн/)) company = 'kids';
  else if (has(/вдво|с девушк|с парн|с мужем|с женой|с партн|свидан|с мамой|с папой|с подруг|с другом/)) company = 'pair';
  else if (has(/компани|друзь|с друзьями|толп/)) company = 'friends';
  else if (has(/в одиночку|сам с собой|одна дома|один дома/)) company = 'solo';
  if (company) {
    patch.company = company;
    understood.push({ kids: 'с детьми', pair: 'вдвоём', friends: 'с компанией', solo: 'в одиночку' }[company]);
  }

  // 5. Wanted experiences (max 2, in the order they were mentioned)
  const wants = WANT_RULES.map(([re, key, label]) => {
    const m = text.match(new RegExp(re.source.replace(/\[её\]/g, 'е')));
    return m ? { key, label, at: m.index ?? 0 } : null;
  })
    .filter((x): x is { key: ExperienceKey; label: string; at: number } => !!x)
    .sort((a, b) => a.at - b.at)
    .slice(0, 2);
  if (wants.length) {
    patch.wants = wants.map((w) => w.key);
    understood.push(...wants.map((w) => w.label));
  }

  if (has(/без доплат|бесплатн|в подписке|без премиум|без аренд/)) {
    patch.noExtraCost = true;
    understood.push('без доплат');
  }

  return { patch, understood };
}

export const PARSE_EXAMPLES = [
  'что-то тёплое, но не комедию',
  'сил нет, есть часа полтора',
  'красивое и спокойное, с мамой',
  'хочу подумать, но не тяжёлое',
  'сказку с детьми',
];
