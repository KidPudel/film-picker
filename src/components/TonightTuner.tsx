import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, CornerDownLeft, Sparkles, X } from 'lucide-react';
import { useStore, EMPTY_TONIGHT, type Tonight } from '../store/useStore';
import { toast } from '../store/useUI';
import {
  COMPANY_OPTIONS,
  ENERGY_OPTIONS,
  EXPERIENCES,
  TIME_OPTIONS,
  WANTABLE,
  type CompanyValue,
  type EnergyValue,
  type TimeValue,
} from '../data/vocab';
import type { ExperienceKey } from '../data/types';
import { parseTonight, PARSE_EXAMPLES } from '../lib/parse';
import { isTonightActive } from '../lib/match';
import { formatClock, formatToday, greeting } from '../lib/format';
import { useIsPhone, useNow } from '../lib/hooks';
import { Popover } from './Overlay';
import './TonightTuner.css';

/** Presets map to the jobs-to-be-done from research.md (tired, together, kids, serious, short). */
export const PRESETS: { id: string; label: string; patch: Partial<Tonight> }[] = [
  { id: 'tired', label: 'После тяжёлого дня', patch: { time: 125, energy: 'low', wants: ['warm'], company: null } },
  { id: 'pair', label: 'Вечер вдвоём', patch: { time: null, energy: 'mid', wants: ['humor', 'beauty'], company: 'pair' } },
  { id: 'kids', label: 'Смотрим с детьми', patch: { time: 125, energy: null, wants: [], company: 'kids' } },
  { id: 'deep', label: 'Хочу серьёзного кино', patch: { time: 'evening', energy: 'high', wants: ['think', 'catharsis'], company: null } },
  { id: 'short', label: 'Есть только полтора часа', patch: { time: 95, energy: null, wants: [], company: null } },
];

const sameTonight = (t: Tonight, p: Partial<Tonight>) =>
  (Object.keys(p) as (keyof Tonight)[]).every((k) => JSON.stringify(t[k]) === JSON.stringify(p[k]));

const joinWants = (w: ExperienceKey[]) => w.map((k) => EXPERIENCES[k].gen).join(' и ');

export function TonightTuner() {
  const now = useNow();
  const tonight = useStore((s) => s.tonight);
  const setTonight = useStore((s) => s.setTonight);
  const active = isTonightActive(tonight);

  const applyWithUndo = (patch: Partial<Tonight>, message: string) => {
    const prev = useStore.getState().tonight;
    setTonight({ ...patch, excludes: patch.excludes ?? [] });
    toast(message, { label: 'Отменить', run: () => useStore.getState().setTonight(prev) });
  };

  return (
    <section className="tuner" aria-labelledby="tuner-title">
      <div className="tuner__inner container">
        <p className="eyebrow tuner__eyebrow">
          <span>{formatToday(now)}</span>
          <span aria-hidden="true"> · </span>
          <time dateTime={now.toISOString()}>{formatClock(now)}</time>
        </p>
        <h1 id="tuner-title" className="tuner__title display">
          {greeting(now)}. <em>Что посмотрим?</em>
        </h1>

        <form className="tuner__sentence" onSubmit={(e) => e.preventDefault()} aria-describedby="tuner-help">
          <p id="tuner-help" className="sr-only">
            Заполните предложение — подборка ниже перестроится. Любую часть можно оставить пустой.
          </p>
          <span>Сегодня у меня </span>
          <Slot
            label="Время"
            question="Сколько у вас времени?"
            empty="сколько времени"
            value={TIME_OPTIONS.find((o) => o.value === tonight.time)?.label}
            onClear={() => setTonight({ time: null })}
          >
            {(close) => (
              <OptionList<TimeValue>
                options={TIME_OPTIONS}
                value={tonight.time}
                onPick={(v) => {
                  setTonight({ time: v });
                  close();
                }}
              />
            )}
          </Slot>
          <span>, </span>
          <Slot
            label="Силы"
            question="Сколько сил осталось?"
            empty="сколько сил"
            value={ENERGY_OPTIONS.find((o) => o.value === tonight.energy)?.label}
            onClear={() => setTonight({ energy: null })}
          >
            {(close) => (
              <OptionList<EnergyValue>
                options={ENERGY_OPTIONS}
                value={tonight.energy}
                onPick={(v) => {
                  setTonight({ energy: v });
                  close();
                }}
              />
            )}
          </Slot>
          <span>, хочется </span>
          <Slot
            label="Настроение"
            question="Чего хочется от фильма?"
            empty="чего"
            value={tonight.wants.length ? joinWants(tonight.wants) : undefined}
            onClear={() => setTonight({ wants: [] })}
            wide
          >
            {(close) => <WantPicker value={tonight.wants} onChange={(wants) => setTonight({ wants })} onDone={close} />}
          </Slot>
          <span>. Смотрю </span>
          <Slot
            label="С кем"
            question="С кем смотрите?"
            empty="с кем"
            value={COMPANY_OPTIONS.find((o) => o.value === tonight.company)?.label}
            onClear={() => setTonight({ company: null })}
          >
            {(close) => (
              <OptionList<CompanyValue>
                options={COMPANY_OPTIONS}
                value={tonight.company}
                onPick={(v) => {
                  setTonight({ company: v });
                  close();
                }}
              />
            )}
          </Slot>
          <span>.</span>
          <AnimatePresence>
            {active && (
              <motion.button
                type="button"
                className="tuner__reset"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                onClick={() => applyWithUndo(EMPTY_TONIGHT, 'Вечер сброшен — показываем всю афишу')}
              >
                <X aria-hidden="true" /> Сбросить
              </motion.button>
            )}
          </AnimatePresence>
        </form>

        <FreeText onApply={applyWithUndo} />

        <div className="tuner__presets" role="group" aria-label="Быстрый старт">
          <span className="tuner__presets-label">Быстрый старт</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip"
              aria-pressed={sameTonight(tonight, p.patch)}
              onClick={() => applyWithUndo(p.patch, `Настроили вечер: «${p.label}»`)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Slot: one blank in the sentence ──────────────────────────────────────

function Slot({
  label,
  question,
  empty,
  value,
  onClear,
  children,
  wide,
}: {
  label: string;
  question: string;
  empty: string;
  value?: string;
  onClear: () => void;
  children: (close: () => void) => ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`slot ${value ? 'is-set' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${value ?? 'не выбрано'}. Изменить`}
        onClick={() => setOpen((v) => !v)}
      >
        <motion.span key={value ?? 'empty'} className="slot__text" initial={{ opacity: 0, filter: 'blur(4px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.22 }}>
          {value ?? empty}
        </motion.span>
        <ChevronDown className="slot__chev" aria-hidden="true" />
      </button>
      <Popover open={open} onClose={close} anchorRef={ref} label={question} width={wide ? 460 : 320}>
        <div className="slot-pop">
          <p className="slot-pop__q">{question}</p>
          {children(close)}
          {value && (
            <button
              type="button"
              className="btn btn--quiet btn--sm slot-pop__clear"
              onClick={() => {
                onClear();
                close();
              }}
            >
              Не важно
            </button>
          )}
        </div>
      </Popover>
    </>
  );
}

function OptionList<T extends string | number>({
  options,
  value,
  onPick,
}: {
  options: { value: T; label: string; hint: string }[];
  value: T | null;
  onPick: (v: T) => void;
}) {
  return (
    <ul className="optlist" role="list">
      {options.map((o) => (
        <li key={String(o.value)}>
          <button type="button" className="optlist__item" aria-pressed={value === o.value} onClick={() => onPick(o.value)} data-autofocus={value === o.value ? '' : undefined}>
            <span className="optlist__label">{o.label}</span>
            <span className="optlist__hint">{o.hint}</span>
            {value === o.value && <Check className="optlist__check" aria-hidden="true" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

function WantPicker({ value, onChange, onDone }: { value: ExperienceKey[]; onChange: (v: ExperienceKey[]) => void; onDone: () => void }) {
  const toggle = (k: ExperienceKey) => {
    if (value.includes(k)) onChange(value.filter((x) => x !== k));
    else onChange(value.length >= 2 ? [value[1], k] : [...value, k]);
  };
  return (
    <div className="wants">
      <p className="wants__hint" id="wants-hint">
        Можно выбрать два. Речь о том, что вы хотите получить, а не о том, как вы себя чувствуете.
      </p>
      <div className="wants__grid" role="group" aria-describedby="wants-hint">
        {WANTABLE.map((k) => (
          <button key={k} type="button" className="want" aria-pressed={value.includes(k)} onClick={() => toggle(k)}>
            <span className="want__label">{EXPERIENCES[k].label}</span>
            <span className="want__hint">{EXPERIENCES[k].hint}</span>
          </button>
        ))}
      </div>
      <button type="button" className="btn btn--primary btn--sm wants__done" onClick={onDone}>
        Готово
      </button>
    </div>
  );
}

// ─── Free text: «скажите своими словами» ──────────────────────────────────

function FreeText({ onApply }: { onApply: (patch: Partial<Tonight>, message: string) => void }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [example, setExample] = useState(0);
  const [result, setResult] = useState<{ understood: string[]; failed?: boolean } | null>(null);
  const phone = useIsPhone();

  useEffect(() => {
    if (text || focused) return;
    const id = window.setInterval(() => setExample((i) => (i + 1) % PARSE_EXAMPLES.length), 3800);
    return () => window.clearInterval(id);
  }, [text, focused]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    const { patch, understood } = parseTonight(q);
    if (!understood.length) {
      setResult({ understood: [], failed: true });
      return;
    }
    // Free text replaces the sentence entirely, so stale choices don't linger.
    onApply({ ...EMPTY_TONIGHT, ...patch }, `Поняли так: ${understood.join(', ')}`);
    setResult({ understood });
  };

  return (
    <div className="freetext">
      <form className="freetext__form" onSubmit={submit} role="search" aria-label="Описать вечер своими словами">
        <Sparkles className="freetext__icon" aria-hidden="true" />
        <label htmlFor="freetext" className="sr-only">
          Или опишите вечер своими словами
        </label>
        <input
          id="freetext"
          className="freetext__input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="off"
          enterKeyHint="go"
          placeholder={phone ? `«${PARSE_EXAMPLES[example]}»` : `Или своими словами: «${PARSE_EXAMPLES[example]}»`}
        />
        <button type="submit" className="btn btn--ghost btn--sm freetext__go" disabled={!text.trim()}>
          Подобрать <CornerDownLeft aria-hidden="true" />
        </button>
      </form>
      <div className="freetext__result" aria-live="polite">
        {result?.failed && (
          <p className="freetext__fail">
            Не получилось разобрать. Попробуйте проще — например, «{PARSE_EXAMPLES[1]}» — или выберите в предложении выше.
          </p>
        )}
        {result && !result.failed && (
          <p className="freetext__ok">
            <span>Поняли так:</span>
            {result.understood.map((u) => (
              <span key={u} className="freetext__token">
                {u}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
