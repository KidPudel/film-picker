import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, Bell, BellRing, ChevronLeft, ChevronRight, Columns2, Crown, Eye, KeyRound, Play, ShieldAlert, Trophy } from 'lucide-react';
import type { Film } from '../data/types';
import { useStore } from '../store/useStore';
import { toast, useUI } from '../store/useUI';
import { EXPERIENCES, SCALE_TEXT } from '../data/vocab';
import { FILMS, FILM_BY_ID } from '../data/films';
import { FRIEND_BY_ID, FRIEND_TAKES } from '../data/social';
import { isTonightActive, matchFilm, rankFilms, type Match } from '../lib/match';
import { alternatives } from '../lib/assistant';
import { finishTime, formatClock, formatIsoDay, formatRawDate, formatRuntime, formatScore, formatVotes, plural, speakRuntime } from '../lib/format';
import { goBack, navigate } from '../lib/router';
import { useNow } from '../lib/hooks';
import { Meter } from '../components/Controls';
import { SpoilerControl } from '../components/SettingsPanel';
import { Assistant } from '../components/Assistant';
import { AvailabilityLabel } from '../components/Availability';
import { NotThisButton, ShelfButton, TicketButton } from '../components/FilmActions';
import { FriendsLine, Poster, openFilm } from '../components/Poster';
import { Reason, ToneIcon } from '../components/ReasonIcon';
import { FilmBackdrop } from '../components/Screen';
import { Seats } from '../components/Seats';
import './FilmPage.css';

const SECTIONS = [
  { id: 'fit', label: 'Подойдёт ли' },
  { id: 'feel', label: 'Ощущение' },
  { id: 'story', label: 'О чём' },
  { id: 'ask', label: 'Спросить' },
  { id: 'ratings', label: 'Оценки' },
  { id: 'people', label: 'Создатели' },
  { id: 'details', label: 'Детали' },
  { id: 'sources', label: 'Источники' },
];

function Section({ id, title, lead, children }: { id: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="fsec" aria-labelledby={`${id}-h`}>
      <div className="fsec__head">
        <h2 id={`${id}-h`} className="fsec__title" tabIndex={-1}>
          {title}
        </h2>
        {lead && <p className="fsec__lead">{lead}</p>}
      </div>
      <div className="fsec__body">{children}</div>
    </section>
  );
}

function useMatch(f: Film, now: Date) {
  const tonight = useStore((s) => s.tonight);
  const dislikes = useStore((s) => s.dislikes);
  const seen = useStore((s) => s.seen);
  const shelves = useStore((s) => s.shelves);
  return useMemo(() => matchFilm(f, { tonight, dislikes, seen, shelves, now }), [f, tonight, dislikes, seen, shelves, now]);
}

/** The same order as the afisha, so «следующий» means the next film you'd see there. */
function useNeighbours(f: Film, now: Date) {
  const tonight = useStore((s) => s.tonight);
  const dislikes = useStore((s) => s.dislikes);
  const seen = useStore((s) => s.seen);
  const shelves = useStore((s) => s.shelves);
  const dismissed = useStore((s) => s.dismissed);
  const sort = useStore((s) => s.sort);
  return useMemo(() => {
    const r = rankFilms(FILMS, { tonight, dislikes, seen, shelves, now }, dismissed, sort);
    const list: Match[] = [...r.fits, ...r.almost];
    const i = list.findIndex((m) => m.film.id === f.id);
    if (i < 0) return { prev: undefined, next: undefined, pos: 0, total: list.length, fits: r.fits.length };
    return { prev: list[i - 1]?.film, next: list[i + 1]?.film, pos: i + 1, total: list.length, fits: r.fits.length };
  }, [f, tonight, dislikes, seen, shelves, dismissed, sort, now]);
}

const step = (to: Film | undefined, instant: boolean) => to && navigate(`/film/${to.slug}`, { filmId: to.id, instant, replace: true });

export function FilmPage({ film }: { film: Film }) {
  const h1 = useRef<HTMLHeadingElement>(null);
  const now = useNow();
  const f = film;
  const n = useNeighbours(f, now);

  // Move focus to the title so screen readers announce the new page.
  useEffect(() => {
    h1.current?.focus({ preventScroll: true });
  }, [f.id]);

  // ← / → step through the afisha. Keyboard moves never animate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [role="radiogroup"], [contenteditable="true"]')) return;
      if (useUI.getState().overlay || document.querySelector('.ov-pop, .ov-sheet')) return;
      if (e.key === 'ArrowRight' && n.next) step(n.next, true);
      if (e.key === 'ArrowLeft' && n.prev) step(n.prev, true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n.next, n.prev]);

  const meta = [
    String(f.year),
    f.countries.join(', '),
    `режиссёр ${f.directors.join(', ')}`,
    f.isBW ? 'чёрно-белый' : null,
  ].filter(Boolean) as string[];

  return (
    <article className="film" style={{ ['--accent' as string]: f.ed.accent }}>
      <section className="fhero" aria-label="Фильм">
        <FilmBackdrop film={f} className="fhero__media" onSwipe={(d) => step(d > 0 ? n.next : n.prev, false)} />
        <div className="fhero__over container">
          <div className="fhero__bar">
            <button type="button" className="btn btn--quiet btn--sm fhero__back" onClick={goBack}>
              <ArrowLeft aria-hidden="true" /> К афише
            </button>
            <nav className="fhero__step" aria-label="Другие фильмы афиши">
              <button type="button" className="icon-btn" disabled={!n.prev} onClick={() => step(n.prev, false)} aria-label={n.prev ? `Предыдущий: «${n.prev.title}»` : 'Это первый фильм в афише'} title="← на клавиатуре">
                <ChevronLeft aria-hidden="true" />
              </button>
              <span className="fhero__pos">
                {n.pos} из {n.total}
              </span>
              <button type="button" className="icon-btn" disabled={!n.next} onClick={() => step(n.next, false)} aria-label={n.next ? `Следующий: «${n.next.title}»` : 'Это последний фильм в афише'} title="→ на клавиатуре">
                <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          </div>

          <div className="fhero__main">
            <Poster film={f} hero="screen" eager sizes="200px" className="fhero__poster" alt={`Постер фильма «${f.title}»`} />
            <header className="fhero__titles">
              <h1 className="fhero__title" ref={h1} tabIndex={-1}>
                {f.title}
              </h1>
              {f.originalTitle !== f.title && (
                <p className="fhero__orig" lang={f.originalLang}>
                  {f.originalTitle}
                </p>
              )}
              <ul className="fhero__meta" aria-label="Коротко о фильме">
                {meta.map((m) => (
                  <li key={m}>{m}</li>
                ))}
                <li>
                  <span aria-label={speakRuntime(f.runtime)}>{formatRuntime(f.runtime)}</span>
                </li>
                <li className="fhero__age">{f.age}</li>
              </ul>
              <p className="fhero__fit">{f.ed.fitLine}</p>
              <ul className="words fhero__words" aria-label="Что даёт фильм">
                {f.ed.experiences.map((w) => (
                  <li key={w}>{EXPERIENCES[w].label}</li>
                ))}
              </ul>
            </header>
          </div>
          <Decision film={f} now={now} />
        </div>
      </section>
      <Seats className="fhero__seats" />

      <FilmNav film={f} />

      <div className="film__body container">
        <FitSection film={f} now={now} />
        <FeelSection film={f} />
        <StorySection film={f} />
        <Section id="ask" title="Спросить без спойлеров" lead="Сами решите, сколько хотите знать заранее.">
          <Assistant film={f} />
        </Section>
        <RatingsSection film={f} />
        <PeopleSection film={f} />
        <DetailsSection film={f} />
        <SourcesSection film={f} />
        <AltSection film={f} />
      </div>
      <MobileBar film={f} />
    </article>
  );
}

// ─── Decision ─────────────────────────────────────────────────────────────

function primaryAction(f: Film, reminded: boolean) {
  const a = f.ed.availability;
  if (a.kind === 'included') return { label: 'Смотреть', Icon: Play };
  if (a.kind === 'premium') return { label: 'Смотреть с Премиум', Icon: Crown };
  if (a.kind === 'rent') return { label: `Арендовать за ${a.price} ₽`, Icon: KeyRound };
  return { label: reminded ? 'Напомним в день премьеры' : 'Напомнить о премьере', Icon: reminded ? BellRing : Bell };
}

function usePrimary(f: Film) {
  const open = useUI((s) => s.open);
  const reminded = useStore((s) => s.reminders.includes(f.id));
  const toggleReminder = useStore((s) => s.toggleReminder);
  const { label, Icon } = primaryAction(f, reminded);
  const run = () => {
    const a = f.ed.availability;
    if (a.kind === 'included') open({ type: 'watch', filmId: f.id });
    else if (a.kind === 'soon') {
      toggleReminder(f.id);
      if (reminded) toast('Напоминание отменено', { label: 'Вернуть', run: () => useStore.getState().toggleReminder(f.id) });
      else toast(`Напомним ${formatIsoDay(a.date)}, когда «${f.title}» появится в каталоге`, { label: 'Отменить', run: () => useStore.getState().toggleReminder(f.id) });
    } else open({ type: 'paywall', filmId: f.id });
  };
  return { label, Icon, run, reminded };
}

function Verdict({ m }: { m: Match }) {
  const tonight = useStore((s) => s.tonight);
  if (!isTonightActive(tonight)) {
    return (
      <div className="verdict">
        <p className="verdict__none">
          Расскажите о вечере в{' '}
          <button type="button" className="linklike" onClick={() => navigate('/')}>
            афише
          </button>
          , и здесь будет видно, подходит ли фильм именно вам.
        </p>
      </div>
    );
  }
  const no = m.reasons.filter((r) => r.tone === 'no');
  const warn = m.reasons.filter((r) => r.tone === 'warn');
  const ok = m.reasons.filter((r) => r.tone === 'ok');
  const top = [...no, ...warn, ...ok].slice(0, 3);
  return (
    <div className={`verdict ${m.fits ? 'verdict--yes' : 'verdict--no'}`}>
      <p className="verdict__head">
        <ToneIcon tone={m.fits ? 'ok' : 'no'} />
        {m.fits ? 'Под ваш вечер подходит' : 'Под ваш вечер подходит не во всём'}
      </p>
      <ul className="reasons verdict__list">
        {top.map((r) => (
          <Reason key={r.text} tone={r.tone} text={r.text} />
        ))}
      </ul>
      {m.reasons.length > top.length && (
        <a className="verdict__more" href="#fit" onClick={(e) => jump(e, 'fit')}>
          Все причины
        </a>
      )}
    </div>
  );
}

function jump(e: React.MouseEvent, id: string) {
  e.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce';
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  document.getElementById(`${id}-h`)?.focus({ preventScroll: true });
}

function Decision({ film: f, now }: { film: Film; now: Date }) {
  const tickets = useStore((s) => s.tickets);
  const spoiler = useStore((s) => s.spoiler);
  const open = useUI((s) => s.open);
  const m = useMatch(f, now);
  const { label, Icon, run, reminded } = usePrimary(f);
  const a = f.ed.availability;
  const others = tickets.filter((t) => t !== f.id);
  const pct = Math.min(100, ((f.runtime + 5) / 180) * 100);

  return (
    <div className="decide">
      <Verdict m={m} />

      <div className="decide__row">
        <button
          type="button"
          className={`btn btn--lg ${a.kind === 'soon' && reminded ? 'btn--ghost' : 'btn--film'} decide__cta`}
          onClick={run}
          aria-pressed={a.kind === 'soon' ? reminded : undefined}
        >
          <Icon aria-hidden="true" /> {label}
        </button>
        <TicketButton film={f} variant="full" />
        <ShelfButton film={f} variant="full" />
        <NotThisButton film={f} variant="full" />
      </div>

      <div className="decide__facts">
        {a.kind !== 'soon' ? (
          <div className="decide__session">
            <span className="sr-only">Если начать сейчас, фильм закончится около {finishTime(f.runtime, now)}.</span>
            <span className="decide__clock" aria-hidden="true">
              <time>{formatClock(now)}</time>
              <span className="decide__track">
                <span style={{ width: `${pct}%` }} />
              </span>
              <span className="decide__end">
                до <time>{finishTime(f.runtime, now)}</time>
              </span>
            </span>
          </div>
        ) : (
          <p className="decide__soon">Сегодня посмотреть нельзя: фильм появится {formatIsoDay(a.date)}.</p>
        )}
        <p className="decide__access">
          <AvailabilityLabel a={a} />
          <span className="decide__note">
            {a.kind === 'included' && 'без доплат'}
            {a.kind === 'premium' && 'подписка «Премиум», 399 ₽ в месяц, 7 дней бесплатно'}
            {a.kind === 'rent' && 'на 48 часов, в подписку не входит'}
            {a.kind === 'soon' && 'можно попросить напомнить'}
          </span>
          <span className="demo-tag">демо</span>
        </p>
      </div>

      {(others.length > 0 || f.trailerUrl) && (
        <div className="decide__more">
          {others.slice(0, 2).map((o) => (
            <button key={o} type="button" className="btn btn--quiet btn--sm" onClick={() => open({ type: 'compare', ids: [f.id, o] })}>
              <Columns2 aria-hidden="true" /> Сравнить с «{FILM_BY_ID.get(o)?.title}»
            </button>
          ))}
          {f.trailerUrl && (
            <a className="btn btn--quiet btn--sm decide__trailer" href={f.trailerUrl} target="_blank" rel="noopener noreferrer">
              <Eye aria-hidden="true" />
              Трейлер
              <ArrowUpRight aria-hidden="true" />
              <span className="sr-only"> (откроется в новой вкладке)</span>
            </a>
          )}
          {f.trailerUrl && spoiler < 2 && <span className="decide__warn">Трейлеры часто раскрывают больше, чем завязку.</span>}
        </div>
      )}
    </div>
  );
}

/** Section links + a compact action, once the hero has scrolled away. */
function FilmNav({ film: f }: { film: Film }) {
  const { label, Icon, run } = usePrimary(f);
  const [stuck, setStuck] = useState(false);
  const [current, setCurrent] = useState('fit');
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    const secs = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io2 = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) {
          setCurrent(vis.target.id);
          secs.forEach((sec) => sec.classList.toggle('is-lit', sec === vis.target));
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    secs.forEach((s) => io2.observe(s));
    return () => {
      io.disconnect();
      io2.disconnect();
    };
  }, [f.id]);

  return (
    <>
      <div ref={sentinel} className="fnav-sentinel" aria-hidden="true" />
      <div className={`fnav ${stuck ? 'is-stuck' : ''}`}>
        <div className="fnav__inner container">
          <p className="fnav__title" aria-hidden={!stuck}>
            {f.title}
          </p>
          <nav className="fnav__links" aria-label="Разделы страницы">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} aria-current={current === s.id ? 'true' : undefined} onClick={(e) => jump(e, s.id)}>
                {s.label}
              </a>
            ))}
          </nav>
          <button type="button" className="btn btn--film btn--sm fnav__cta" onClick={run} tabIndex={stuck ? 0 : -1} aria-hidden={!stuck}>
            <Icon aria-hidden="true" /> {label}
          </button>
        </div>
      </div>
    </>
  );
}

function MobileBar({ film: f }: { film: Film }) {
  const { label, Icon, run } = usePrimary(f);
  return (
    <div className="mbar" role="region" aria-label="Решение">
      <TicketButton film={f} />
      <ShelfButton film={f} />
      <button type="button" className="btn btn--film mbar__cta" onClick={run}>
        <Icon aria-hidden="true" /> {label}
      </button>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────

function FitSection({ film: f, now }: { film: Film; now: Date }) {
  const tonight = useStore((s) => s.tonight);
  const active = isTonightActive(tonight);
  const m = useMatch(f, now);

  return (
    <Section id="fit" title="Подойдёт ли сегодня">
      {active ? (
        <div className="fitcheck">
          <p className="fitcheck__verdict">
            <ToneIcon tone={m.fits ? 'ok' : 'no'} />
            {m.fits ? 'Под ваш вечер подходит' : 'Под ваш вечер подходит не во всём'}
            <button type="button" className="linklike fitcheck__edit" onClick={() => navigate('/')}>
              Изменить вечер
            </button>
          </p>
          <ul className="reasons fitcheck__list">
            {m.reasons.map((r) => (
              <Reason key={r.text} tone={r.tone} text={r.text} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="fsec__text">
          Вы ещё не рассказали о вечере.{' '}
          <button type="button" className="linklike" onClick={() => navigate('/')}>
            Заполните одно предложение в афише
          </button>
          , и мы проверим, подходит ли фильм именно вам. А пока — общий ориентир.
        </p>
      )}
      <div className="whenwhen">
        <div>
          <h3 className="whenwhen__h">
            <ToneIcon tone="ok" /> Хорошо, когда
          </h3>
          <ul>
            {f.ed.goodWhen.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="whenwhen__h">
            <ToneIcon tone="warn" /> Лучше отложить, если
          </h3>
          <ul>
            {f.ed.skipIf.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="fsec__note">{f.ed.company.note}</p>
    </Section>
  );
}

function FeelSection({ film: f }: { film: Film }) {
  const s = f.ed.scales;
  return (
    <Section id="feel" title="Каким будет этот вечер" lead="Редакционная оценка опыта — ориентир, а не обещание.">
      <div className="feel">
        <div className="feel__meters">
          <Meter label="Темп" value={s.pace} text={SCALE_TEXT.pace[s.pace]} />
          <Meter label="Нагрузка" value={s.intensity} text={SCALE_TEXT.intensity[s.intensity]} />
          <Meter label="Внимание" value={s.attention} text={SCALE_TEXT.attention[s.attention]} />
          <Meter label="Юмор" value={s.humor} text={SCALE_TEXT.humor[s.humor]} />
        </div>
        <div className="feel__text">
          <div>
            <h3 className="feel__h">Настроение</h3>
            <p>{f.mood}</p>
          </div>
          <div>
            <h3 className="feel__h">Как снято</h3>
            <p>{f.visualStyle}</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function StorySection({ film: f }: { film: Film }) {
  const spoiler = useStore((s) => s.spoiler);
  const [peek, setPeek] = useState(0); // one-off reveals for this film only
  const level = Math.max(spoiler, peek);
  const [notes, setNotes] = useState(false);

  return (
    <Section id="story" title="О чём фильм">
      <SpoilerControl compact />
      <div className="story">
        {level >= 1 ? (
          <p className="story__logline">{f.logline}</p>
        ) : (
          <Veil label="Завязка скрыта: вы просили ничего не рассказывать" action="Показать одну фразу" onReveal={() => setPeek(1)} />
        )}
        {level >= 1 && (
          <ul className="story__themes" aria-label="Темы">
            {f.themes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        {level >= 2 ? (
          <p className="story__synopsis">{f.synopsis}</p>
        ) : (
          level >= 1 && <Veil label="Подробное описание скрыто" action="Показать описание без поворотов" onReveal={() => setPeek(2)} />
        )}
        {level >= 3 ? (
          <div className="story__context">
            <h3 className="story__h">Контекст</h3>
            <p>{f.context}</p>
            <ul>
              {f.facts.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : (
          level >= 2 && (
            <button type="button" className="linklike story__more" onClick={() => setPeek(3)}>
              Показать контекст и факты о создании
            </button>
          )
        )}
      </div>

      <div className="notes">
        <div className="notes__head">
          <ShieldAlert aria-hidden="true" className="notes__icon" />
          <div>
            <h3 className="notes__title">Деликатные моменты</h3>
            <p className="notes__lead">Для тех, кому важно знать заранее. Пометки могут намекать на события сюжета.</p>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" aria-expanded={notes} aria-controls={`notes-${f.id}`} onClick={() => setNotes((v) => !v)}>
            {notes ? 'Скрыть' : 'Показать'}
          </button>
        </div>
        {notes && (
          <ul className="notes__list" id={`notes-${f.id}`}>
            {f.ed.contentNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function Veil({ label, action, onReveal }: { label: string; action: string; onReveal: () => void }) {
  return (
    <div className="veil">
      <div className="veil__lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="veil__label">{label}</p>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onReveal}>
        {action}
      </button>
    </div>
  );
}

function RatingsSection({ film: f }: { film: Film }) {
  const takes = FRIEND_TAKES[f.id] ?? [];
  const wins = f.awards.filter((a) => a.result === 'win');
  const noms = f.awards.filter((a) => a.result !== 'win');
  const checked = f.ratings.kp?.checked_on ?? f.ratings.imdb?.checked_on;
  return (
    <Section
      id="ratings"
      title="Оценки и признание"
      lead="Рейтинги говорят о репутации, а не о том, подойдёт ли фильм именно сегодня. Поэтому рядом — люди, которым вы доверяете."
    >
      <div className="ratings">
        {f.ratings.kp && <Score name="Кинопоиск" value={f.ratings.kp.value} votes={formatVotes(f.ratings.kp.votes, f.ratings.kp.votes_approximate)} />}
        {f.ratings.imdb && <Score name="IMDb" value={f.ratings.imdb.value} votes={formatVotes(f.ratings.imdb.votes, f.ratings.imdb.votes_approximate)} />}
        <div className="score score--friends">
          <p className="score__name">
            Ваш круг <span className="demo-tag">демо</span>
          </p>
          {takes.length ? (
            <ul className="takes">
              {takes.map((t) => {
                const fr = FRIEND_BY_ID.get(t.friend)!;
                return (
                  <li key={t.friend}>
                    <span className="face" style={{ ['--h' as string]: fr.hue }} aria-hidden="true">
                      {fr.name[0]}
                    </span>
                    <span className="takes__who">
                      <span>
                        {fr.name} <span className="takes__circle">, {fr.circle}</span>
                      </span>
                      {t.note && <span className="takes__note">«{t.note}»</span>}
                      {t.recommendsTo && <span className="takes__rec">советует {t.recommendsTo === 'вам' ? 'вам' : `группе «${t.recommendsTo}»`}</span>}
                    </span>
                    <span className="takes__score">
                      {t.score}
                      <span className="sr-only"> из 10</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="score__empty">Никто из вашего круга ещё не смотрел. Можно стать первым — и посоветовать.</p>
          )}
        </div>
      </div>
      {checked && <p className="fsec__note">Рейтинги проверены {formatRawDate(checked)}.</p>}

      {f.awards.length > 0 && (
        <div className="awards">
          <h3 className="awards__h">
            <Trophy aria-hidden="true" />
            {wins.length > 0 && `${wins.length} ${plural(wins.length, ['награда', 'награды', 'наград'])}`}
            {wins.length > 0 && noms.length > 0 && ' и '}
            {noms.length > 0 && `${noms.length} ${plural(noms.length, ['номинация', 'номинации', 'номинаций'])}`}
          </h3>
          <ul className="awards__list">
            {f.awards.map((a, i) => (
              <li key={i} className={a.result === 'win' ? 'is-win' : ''}>
                <span className="awards__event">
                  {a.event}, {a.year}
                </span>
                <span className="awards__cat">
                  {a.category}
                  {a.recipient && ` — ${a.recipient}`}
                </span>
                <span className="awards__res">{a.result === 'win' ? 'победа' : 'номинация'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function Score({ name, value, votes }: { name: string; value: number; votes: string }) {
  return (
    <div className="score">
      <p className="score__name">{name}</p>
      <p className="score__value">
        {formatScore(value)}
        <span className="score__of"> из 10</span>
      </p>
      <p className="score__votes">{votes}</p>
    </div>
  );
}

function PeopleSection({ film: f }: { film: Film }) {
  return (
    <Section id="people" title="Кто снял и кто играет">
      <div className="people">
        <div className="people__dir">
          <p className="people__label">Режиссёр</p>
          <p className="people__dirname">{f.directors.join(', ')}</p>
        </div>
        <ul className="cast">
          {f.cast.map((c) => (
            <li key={c.name_ru}>
              <span className="cast__name">{c.name_ru}</span>
              {c.role && <span className="cast__role">{c.role}</span>}
            </li>
          ))}
        </ul>
      </div>
      <dl className="crew">
        {f.crew.map((c) => (
          <div key={c.label}>
            <dt>{c.label}</dt>
            <dd>{c.people.join(', ')}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function DetailsSection({ film: f }: { film: Film }) {
  const rows: [string, ReactNode][] = [
    ['Длительность', formatRuntime(f.runtime)],
    [
      'Звук и субтитры',
      <>
        {f.ed.audio.join(', ')} <span className="demo-tag">демо</span>
      </>,
    ],
    ['Языки оригинала', f.languages.join(', ')],
    ['Изображение', `${f.isBW ? 'Чёрно-белое' : 'Цветное'}, кадр ${f.aspect}`],
    ['Возраст', f.age],
    ['Страны', f.countries.join(', ')],
    ...f.premieres.map((p): [string, ReactNode] => [p.label, p.date ? `${p.date}, ${p.event}` : p.event]),
    ...f.finances.map((x): [string, ReactNode] => [x.label, x.value]),
  ];
  return (
    <Section id="details" title="Детали">
      <dl className="details">
        {rows.map(([k, v], i) => (
          <div key={k + i}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function SourcesSection({ film: f }: { film: Film }) {
  const stillsPage = f.stills[0]?.source;
  return (
    <Section id="sources" title="Откуда эти данные" lead="Показываем источники и честно отмечаем, где они расходятся.">
      <ul className="sources">
        {f.sources.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
              <ArrowUpRight aria-hidden="true" />
              <span className="sr-only"> (откроется в новой вкладке)</span>
            </a>
            <span className="sources__when">проверено {formatRawDate(s.accessed_on)}</span>
          </li>
        ))}
        {stillsPage && (
          <li>
            <a href={stillsPage} target="_blank" rel="noopener noreferrer">
              Кадры на экране: The Movie Database (TMDB)
              <ArrowUpRight aria-hidden="true" />
              <span className="sr-only"> (откроется в новой вкладке)</span>
            </a>
            <span className="sources__when">выбраны без спойлеров, 5 октября 2026</span>
          </li>
        )}
      </ul>
      {f.discrepancies.length > 0 && (
        <div className="discrep">
          <h3 className="discrep__h">Где источники расходятся</h3>
          <ul>
            {f.discrepancies.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {f.missing.length > 0 && (
        <div className="discrep">
          <h3 className="discrep__h">Чего мы не нашли</h3>
          <ul>
            {f.missing.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function AltSection({ film: f }: { film: Film }) {
  const alts = useMemo(() => alternatives(f), [f]);
  return (
    <Section id="alts" title="Если не совсем то" lead="Похожие фильмы, которые отличаются в одном понятном направлении.">
      <ul className="alts">
        {alts.map(({ film: a, label }) => (
          <li key={a.id} className="alt">
            <a href={`#/film/${a.slug}`} onClick={(e) => openFilm(a, e)} className="alt__link">
              <Poster film={a} sizes="96px" className="alt__poster" />
              <span className="alt__body">
                <span className="alt__label">{label}</span>
                <span className="alt__title">{a.title}</span>
                <span className="alt__meta">
                  {formatRuntime(a.runtime)}, {SCALE_TEXT.intensity[a.ed.scales.intensity]}
                </span>
              </span>
            </a>
            <FriendsLine film={a} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
