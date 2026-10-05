import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Sparkles } from 'lucide-react';
import type { Film } from '../data/types';
import { useStore } from '../store/useStore';
import { answer, detectIntent, QUESTIONS, type Answer, type Intent } from '../lib/assistant';
import { SPOILER_LEVELS } from '../data/vocab';
import { SpoilerControl } from './SettingsPanel';
import './Assistant.css';

interface Turn {
  id: number;
  q: string;
  intent: Intent | null;
  a?: Answer;
}

let seq = 0;

/**
 * «Подсказчик»: ask about a film without spoilers. The spoiler meter is shared
 * with the rest of the site; changing it re-answers the open questions.
 */
export function Assistant({ film }: { film: Film }) {
  const spoiler = useStore((s) => s.spoiler);
  const setSpoiler = useStore((s) => s.setSpoiler);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const timers = useRef<number[]>([]);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Re-answer when the spoiler level changes, so the thread stays consistent.
  useEffect(() => {
    setTurns((ts) => ts.map((t) => (t.a && t.intent ? { ...t, a: answer(film, t.intent, spoiler) } : t)));
  }, [spoiler, film]);

  const ask = (q: string, intent: Intent | null) => {
    const id = ++seq;
    setTurns((ts) => [...ts.slice(-5), { id, q, intent }]);
    // A short "thinking" beat so the answer reads as a reply, not a page jump.
    const t = window.setTimeout(() => {
      setTurns((ts) =>
        ts.map((x) =>
          x.id === id
            ? {
                ...x,
                a: intent
                  ? answer(film, intent, useStore.getState().spoiler)
                  : { text: 'Пока я отвечаю только на типовые вопросы — о тяжести, темпе, финале, озвучке, компании и похожих фильмах. Попробуйте одну из подсказок ниже.' },
              }
            : x,
        ),
      );
    }, 550);
    timers.current.push(t);
  };

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [turns.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    ask(q, detectIntent(q));
    setText('');
  };

  const asked = new Set(turns.map((t) => t.intent));

  return (
    <div className="asst">
      <div className="asst__meter">
        <SpoilerControl compact />
      </div>

      {turns.length > 0 && (
        <ol className="asst__log" ref={logRef} aria-live="polite">
          <AnimatePresence initial={false}>
            {turns.map((t) => (
              <motion.li key={t.id} className="asst__turn" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
                <p className="asst__q">
                  <span className="sr-only">Вы спросили: </span>
                  {t.q}
                </p>
                {t.a ? (
                  <motion.div className="asst__a" initial={{ opacity: 0, filter: 'blur(3px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.25 }}>
                    <Sparkles className="asst__spark" aria-hidden="true" />
                    <div>
                      <p>
                        <span className="sr-only">Подсказчик: </span>
                        {t.a.text}
                      </p>
                      {t.a.gated && (
                        <p className="asst__gate">
                          {t.a.gated.hint}{' '}
                          <button type="button" className="asst__raise" onClick={() => setSpoiler(t.a!.gated!.need)}>
                            Поднять до «{SPOILER_LEVELS[t.a.gated.need].label}»
                          </button>
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <p className="asst__typing" aria-label="Подсказчик печатает">
                    <span />
                    <span />
                    <span />
                  </p>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      <div className="asst__chips" role="group" aria-label="Готовые вопросы">
        {QUESTIONS.filter((q) => !asked.has(q.intent)).map((q) => (
          <button key={q.intent} type="button" className="chip" onClick={() => ask(q.text, q.intent)}>
            {q.text}
          </button>
        ))}
      </div>

      <form className="asst__form" onSubmit={submit}>
        <label htmlFor={`asst-${film.id}`} className="sr-only">
          Ваш вопрос о фильме
        </label>
        <input
          id={`asst-${film.id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Спросите что угодно — мы не выдадим сюжет"
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" className="asst__send" aria-label="Спросить" disabled={!text.trim()}>
          <ArrowUp aria-hidden="true" />
        </button>
      </form>
      <p className="asst__note">Демо: ответы собраны из редакционных заметок и данных о фильме — сюжетные повороты не раскрываются ни на каком уровне.</p>
    </div>
  );
}
