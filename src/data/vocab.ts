import type { ExperienceKey } from './types';

/**
 * Experience vocabulary. `label` is the floating word on cards (nominative),
 * `gen` is the form used after «хочется …» in the tonight sentence.
 * Only `wantable` words can be asked for — the list is intentionally short:
 * a large vocabulary of vibes would become another selection task.
 */
export const EXPERIENCES: Record<
  ExperienceKey,
  { label: string; gen: string; hint: string; wantable: boolean }
> = {
  warm: { label: 'тепло', gen: 'тепла', hint: 'Добрые, уютные истории', wantable: true },
  humor: { label: 'юмор', gen: 'юмора', hint: 'Можно улыбнуться и посмеяться', wantable: true },
  calm: { label: 'неспешно', gen: 'покоя', hint: 'Медленный ритм, можно выдохнуть', wantable: true },
  magic: { label: 'волшебство', gen: 'волшебства', hint: 'Сказка, легенды, чудо', wantable: true },
  beauty: { label: 'красота кадра', gen: 'красоты', hint: 'Визуально завораживает', wantable: true },
  absorb: { label: 'затягивает', gen: 'захватывающего', hint: 'Трудно оторваться', wantable: true },
  think: { label: 'пища для ума', gen: 'пищи для ума', hint: 'Есть над чем подумать', wantable: true },
  catharsis: { label: 'сильные чувства', gen: 'сильных чувств', hint: 'Может тронуть до слёз', wantable: true },
  discover: { label: 'узнать новое', gen: 'открытий', hint: 'Документальное, другие миры', wantable: true },
  nostalgia: { label: 'ностальгия', gen: 'ностальгии', hint: 'Привкус прошлого', wantable: false },
  discuss: { label: 'обсудить после', gen: 'разговора', hint: 'Захочется поговорить', wantable: false },
  cinephile: { label: 'кино о кино', gen: 'кино о кино', hint: 'Для любящих историю кино', wantable: false },
  tension: { label: 'напряжение', gen: 'напряжения', hint: 'Держит в тревоге', wantable: false },
};

export const WANTABLE = (Object.keys(EXPERIENCES) as ExperienceKey[]).filter(
  (k) => EXPERIENCES[k].wantable,
);

export type TimeValue = 95 | 125 | 155 | 'evening';
export type EnergyValue = 'low' | 'mid' | 'high';
export type CompanyValue = 'solo' | 'pair' | 'kids' | 'friends';

export const TIME_OPTIONS: { value: TimeValue; label: string; hint: string }[] = [
  { value: 95, label: 'около полутора часов', hint: 'до 1 ч 35 мин' },
  { value: 125, label: 'около двух часов', hint: 'до 2 ч 05 мин' },
  { value: 155, label: 'два с половиной часа', hint: 'до 2 ч 35 мин' },
  { value: 'evening', label: 'весь вечер', hint: 'длина не важна' },
];

export const ENERGY_OPTIONS: { value: EnergyValue; label: string; hint: string }[] = [
  { value: 'low', label: 'сил почти не осталось', hint: 'Бережно и без напряжения' },
  { value: 'mid', label: 'сил — средне', hint: 'Можно немного задеть' },
  { value: 'high', label: 'сил хоть отбавляй', hint: 'Готовность к сильному кино' },
];

export const COMPANY_OPTIONS: { value: CompanyValue; label: string; hint: string }[] = [
  { value: 'solo', label: 'в одиночку', hint: 'Только мой вкус' },
  { value: 'pair', label: 'вдвоём', hint: 'Найдём общее' },
  { value: 'kids', label: 'с детьми', hint: 'До 12+' },
  { value: 'friends', label: 'с компанией', hint: 'Чтобы было что обсудить' },
];

/** Limits per energy level: maximum emotional load and attention demand. */
export const ENERGY_CEILING: Record<'low' | 'mid', { intensity: number; attention: number }> = {
  low: { intensity: 2, attention: 3 },
  mid: { intensity: 3, attention: 4 },
};

export const SCALE_TEXT = {
  pace: ['', 'очень неспешно', 'неспешно', 'размеренно', 'бодро', 'динамично'],
  intensity: ['', 'бережно', 'мягко', 'ощутимо', 'тяжело', 'очень тяжело'],
  attention: ['', 'можно фоном', 'легко следить', 'нужно внимание', 'полное внимание', 'максимум внимания'],
  humor: ['почти нет', 'чуть-чуть', 'немного', 'заметно', 'много', 'очень смешно'],
} as const;

export const SPOILER_LEVELS = [
  { value: 0, label: 'Ничего', hint: 'Только настроение и факты — без сюжета' },
  { value: 1, label: 'Завязка', hint: 'Одна фраза о начале истории' },
  { value: 2, label: 'Сюжет', hint: 'Описание без поворотов и финала' },
  { value: 3, label: 'Всё, кроме финала', hint: 'Контекст, факты и тон развязки' },
] as const;
export type SpoilerLevel = 0 | 1 | 2 | 3;

/** Reasons you can attach when saving a film for later («на полку»). */
export const SAVE_REASONS = [
  'Посоветовали',
  'Красивый визуал',
  'Посмотреть вдвоём',
  'Когда будут силы',
  'Важная тема',
  'Любимый режиссёр',
];
