import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, Bell, BellRing, Columns2, Crown, Eye, KeyRound, Play, ShieldAlert, Trophy } from 'lucide-react';
import type { Film } from '../data/types';
import { useStore } from '../store/useStore';
import { toast, useUI } from '../store/useUI';
import { EXPERIENCES, SCALE_TEXT } from '../data/vocab';
import { FILM_BY_ID } from '../data/films';
import { FRIEND_BY_ID, FRIEND_TAKES } from '../data/social';
import { isTonightActive, matchFilm } from '../lib/match';
import { alternatives } from '../lib/assistant';
import { finishTime, formatIsoDay, formatRawDate, formatRuntime, formatScore, formatVotes, speakRuntime } from '../lib/format';
import { goBack, navigate } from '../lib/router';
import { useNow } from '../lib/hooks';
import { Hall } from '../components/Hall';
import { Meter } from '../components/Controls';
import { SpoilerControl } from '../components/SettingsPanel';
import { Assistant } from '../components/Assistant';
import { AvailabilityLabel } from '../components/Availability';
import { NotThisButton, ShelfButton, TicketButton } from '../components/FilmActions';
import { FriendsLine, Poster, openFilm } from '../components/FilmCase';
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
      <h2 id={`${id}-h`} className="fsec__title">
        {title}
      </h2>
      {lead && <p className="fsec__lead">{lead}</p>}
      {children}
    </section>
  );
}

export function FilmPage({ film }: { film: Film }) {
  const h1 = useRef<HTMLHeadingElement>(null);
  const now = useNow();

  // Move focus to the title so screen readers announce the new page.
  useEffect(() => {
    h1.current?.focus({ preventScroll: true });
  }, [film.id]);

  const f = film;
  return (
    <article className="film" style={{ ['--accent' as string]: f.ed.accent }}>
      <Hall film={f} />

      <header className="film__head container">
        <button type="button" className="btn btn--quiet btn--sm film__back" onClick={goBack}>
          <ArrowLeft aria-hidden="true" /> К афише
        </button>
        <p className="eyebrow">
          {f.genres.join(' · ')} · {f.year} · {f.countries.join(', ')}
        </p>
        <h1 className="film__title display" ref={h1} tabIndex={-1}>
          {f.title}
        </h1>
        {f.originalTitle !== f.title && (
          <p className="film__orig" lang={f.originalLang}>
            {f.originalTitle}
          </p>
        )}
        <p className="film__meta">
          <span aria-label={speakRuntime(f.runtime)}>{formatRuntime(f.runtime)}</span>
          <span>режиссёр {f.directors.join(', ')}</span>
          <span className="film__age">{f.age}</span>
          {f.isBW && <span>чёрно-белый</span>}
        </p>
        <ul className="words words--lg" aria-label="Что даёт фильм">
          {f.ed.experiences.map((w) => (
            <li key={w}>{EXPERIENCES[w].label}</li>
          ))}
        </ul>
        <p className="film__fit">{f.ed.fitLine}</p>
      </header>

      <div className="film__layout container">
        <div className="film__main">
          <nav className="film__toc" aria-label="Разделы страницы">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                document.getElementById(`${s.id}-h`)?.focus({ preventScroll: true });
              }}>
                {s.label}
              </a>
            ))}
          </nav>

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

        <aside className="film__aside" aria-label="Решение">
          <DecisionCard film={f} now={now} />
        </aside>
      </div>
      <MobileBar film={f} />
    </article>
  );
}

// ─── Decision card ────────────────────────────────────────────────────────

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
      toast(reminded ? 'Напоминание отменено' : `Напомним ${formatIsoDay(a.date)}, когда «${f.title}» появится в каталоге`);
    } else open({ type: 'paywall', filmId: f.id });
  };
  return { label, Icon, run, reminded };
}

function DecisionCard({ film: f, now }: { film: Film; now: Date }) {
  const tickets = useStore((s) => s.tickets);
  const spoiler = useStore((s) => s.spoiler);
  const open = useUI((s) => s.open);
  const { label, Icon, run, reminded } = usePrimary(f);
  const a = f.ed.availability;
  const others = tickets.filter((t) => t !== f.id);

  return (
    <div className="decide">
      <div className="decide__avail">
        <AvailabilityLabel a={a} />
        <p className="decide__avail-note">
          {a.kind === 'included' && 'Входит в вашу подписку — без доплат.'}
          {a.kind === 'premium' && 'Нужна подписка «Премиум» · 399 ₽ в месяц, первые 7 дней бесплатно.'}
          {a.kind === 'rent' && `Аренда на 48 часов · ${a.price} ₽. В подписку не входит.`}
          {a.kind === 'soon' && `Появится в каталоге ${formatIsoDay(a.date)}. Сегодня посмотреть нельзя.`}
        </p>
      </div>
      <button type="button" className={`btn btn--lg ${a.kind === 'soon' && reminded ? 'btn--ghost' : 'btn--primary'} decide__cta`} onClick={run} aria-pressed={a.kind === 'soon' ? reminded : undefined}>
        <Icon aria-hidden="true" /> {label}
      </button>
      {a.kind !== 'soon' && (
        <p className="decide__time">
          Начнёте сейчас — закончите около <strong>{finishTime(f.runtime, now)}</strong>
        </p>
      )}
      <div className="decide__acts">
        <TicketButton film={f} variant="full" />
        <ShelfButton film={f} variant="full" />
        <NotThisButton film={f} variant="full" />
      </div>
      {others.length > 0 && (
        <div className="decide__compare">
          {others.slice(0, 2).map((o) => (
            <button key={o} type="button" className="btn btn--ghost btn--sm" onClick={() => open({ type: 'compare', ids: [f.id, o] })}>
              <Columns2 aria-hidden="true" /> Сравнить с «{FILM_BY_ID.get(o)?.title}»
            </button>
          ))}
        </div>
      )}
      {f.trailerUrl && (
        <a className="decide__trailer" href={f.trailerUrl} target="_blank" rel="noopener noreferrer">
          <Eye aria-hidden="true" />
          <span>
            Трейлер на сайте дистрибьютора <ArrowUpRight aria-hidden="true" className="decide__ext" />
            <span className="sr-only">(откроется в новой вкладке)</span>
            {spoiler < 2 && <span className="decide__warn">Трейлеры часто раскрывают больше, чем завязку.</span>}
          </span>
        </a>
      )}
    </div>
  );
}

function MobileBar({ film: f }: { film: Film }) {
  const { label, Icon, run } = usePrimary(f);
  return (
    <div className="mbar">
      <TicketButton film={f} />
      <ShelfButton film={f} />
      <button type="button" className="btn btn--primary mbar__cta" onClick={run}>
        <Icon aria-hidden="true" /> {label}
      </button>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────

function FitSection({ film: f, now }: { film: Film; now: Date }) {
  const tonight = useStore((s) => s.tonight);
  const dislikes = useStore((s) => s.dislikes);
  const seen = useStore((s) => s.seen);
  const shelves = useStore((s) => s.shelves);
  const active = isTonightActive(tonight);
  const m = useMemo(() => matchFilm(f, { tonight, dislikes, seen, shelves, now }), [f, tonight, dislikes, seen, shelves, now]);

  return (
    <Section id="fit" title="Подойдёт ли сегодня">
      {active ? (
        <div className={`fitcheck ${m.fits ? 'fitcheck--yes' : 'fitcheck--no'}`}>
          <p className="fitcheck__verdict">
            {m.fits ? 'Под ваш вечер подходит' : 'Под ваш вечер подходит не во всём'}
            <button type="button" className="fitcheck__edit" onClick={() => navigate('/')}>
              изменить вечер
            </button>
          </p>
          <ul className="fitcheck__list">
            {m.reasons.map((r) => (
              <li key={r.text} className={`reason reason--${r.tone}`}>
                <span className="reason__icon" aria-hidden="true">
                  {r.tone === 'ok' ? '✓' : r.tone === 'warn' ? '!' : '✕'}
                </span>
                <span>
                  <span className="sr-only">{r.tone === 'ok' ? 'Подходит: ' : r.tone === 'warn' ? 'Учтите: ' : 'Не подходит: '}</span>
                  {r.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="fsec__lead">
          Вы ещё не рассказали о вечере.{' '}
          <button type="button" className="linklike" onClick={() => navigate('/')}>
            Заполните одно предложение в афише
          </button>
          , и мы проверим, подходит ли фильм именно вам. А пока — общий ориентир:
        </p>
      )}
      <div className="whenwhen">
        <div>
          <h3 className="whenwhen__h whenwhen__h--yes">Хорошо, когда</h3>
          <ul>
            {f.ed.goodWhen.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="whenwhen__h whenwhen__h--no">Лучше отложить, если</h3>
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
    <Section id="feel" title="Каким будет этот вечер" lead="Редакционная оценка опыта — не обещание, а ориентир.">
      <div className="feel">
        <div className="feel__meters">
          <Meter label="Темп" value={s.pace} text={SCALE_TEXT.pace[s.pace]} accent="var(--accent)" />
          <Meter label="Нагрузка" value={s.intensity} text={SCALE_TEXT.intensity[s.intensity]} accent="var(--accent)" />
          <Meter label="Внимание" value={s.attention} text={SCALE_TEXT.attention[s.attention]} accent="var(--accent)" />
          <Meter label="Юмор" value={s.humor} text={SCALE_TEXT.humor[s.humor]} accent="var(--accent)" />
        </div>
        <div className="feel__text">
          <figure className="feel__quote">
            <figcaption>Настроение</figcaption>
            <blockquote>{f.mood}</blockquote>
          </figure>
          <figure className="feel__quote">
            <figcaption>Как снято</figcaption>
            <blockquote>{f.visualStyle}</blockquote>
          </figure>
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
          <Veil label="Завязка скрыта — вы просили ничего не рассказывать" action="Показать одну фразу" onReveal={() => setPeek(1)} />
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
          <ShieldAlert aria-hidden="true" />
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
    <Section id="ratings" title="Оценки и признание" lead="Рейтинги говорят о репутации, а не о том, подойдёт ли фильм именно сегодня. Поэтому рядом — люди, которым вы доверяете.">
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
                      {fr.name} <span className="takes__circle">· {fr.circle}</span>
                      {t.note && <span className="takes__note">«{t.note}»</span>}
                      {t.recommendsTo && <span className="takes__rec">советует {t.recommendsTo === 'вам' ? 'вам' : `группе «${t.recommendsTo}»`}</span>}
                    </span>
                    <span className="takes__score">{t.score}</span>
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
            <Trophy aria-hidden="true" /> {wins.length > 0 && `${wins.length} ${wins.length === 1 ? 'награда' : wins.length < 5 ? 'награды' : 'наград'}`}
            {wins.length > 0 && noms.length > 0 && ' и '}
            {noms.length > 0 && `${noms.length} ${noms.length === 1 ? 'номинация' : noms.length < 5 ? 'номинации' : 'номинаций'}`}
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
        <span className="score__of">/10</span>
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
          <p className="people__dirname display">{f.directors.join(', ')}</p>
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
    ['Длительность', `${formatRuntime(f.runtime)}`],
    ['Звук и субтитры', f.ed.audio.join(' · ')],
    ['Языки оригинала', f.languages.join(', ')],
    ['Изображение', `${f.isBW ? 'Чёрно-белое' : 'Цветное'}, кадр ${f.aspect}`],
    ['Возраст', f.age],
    ['Страны', f.countries.join(', ')],
    ...f.premieres.map((p): [string, ReactNode] => [p.label, p.date ? `${p.date} — ${p.event}` : p.event]),
    ...f.finances.map((x): [string, ReactNode] => [x.label, x.value]),
  ];
  return (
    <Section id="details" title="Детали">
      <dl className="details">
        {rows.map(([k, v]) => (
          <div key={k + String(v)}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function SourcesSection({ film: f }: { film: Film }) {
  return (
    <Section id="sources" title="Откуда эти данные" lead="Мы показываем источники и честно отмечаем, где они расходятся.">
      <ul className="sources">
        {f.sources.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
              <ArrowUpRight aria-hidden="true" />
              <span className="sr-only">(откроется в новой вкладке)</span>
            </a>
            <span className="sources__when">проверено {formatRawDate(s.accessed_on)}</span>
          </li>
        ))}
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
          <li key={a.id} className="alt" style={{ ['--accent' as string]: a.ed.accent }}>
            <a href={`#/film/${a.slug}`} onClick={(e) => openFilm(a, e)} className="alt__link">
              <Poster film={a} sizes="96px" className="alt__poster" />
              <span className="alt__body">
                <span className="alt__label">{label}</span>
                <span className="alt__title">{a.title}</span>
                <span className="alt__meta">
                  {formatRuntime(a.runtime)} · {SCALE_TEXT.intensity[a.ed.scales.intensity]}
                </span>
                <FriendsLine film={a} />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
