import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Ban, Copy, Heart, Users } from 'lucide-react';
import { FILMS, FILM_BY_ID } from '../data/films';
import type { Film } from '../data/types';
import { useStore, EMPTY_TONIGHT, type Tonight, type Vote } from '../store/useStore';
import { toast, useUI } from '../store/useUI';
import { matchFilm } from '../lib/match';
import { formatRuntime } from '../lib/format';
import { EXPERIENCES, ENERGY_OPTIONS, TIME_OPTIONS } from '../data/vocab';
import { Dialog } from './Overlay';
import { Segmented } from './Controls';
import { Poster, openFilm } from './FilmCase';
import './Jam.css';

/**
 * «Смотреть вместе» — a shared session for choosing together.
 * Research: couples take turns, use vetoes, and fear "blame" for a bad pick.
 * So: private votes (partner's are revealed only after you vote — no anchoring),
 * one veto each, and a visible fair-turn rule to break ties.
 * Demo: the partner «Лена» is simulated.
 */

const PARTNER = {
  name: 'Лена',
  gen: 'Лены',
  hue: 265,
  tonight: { ...EMPTY_TONIGHT, time: 125, energy: 'low', wants: ['humor', 'warm'] } as Tonight,
};

function partnerVote(f: Film): Vote {
  const m = matchFilm(f, { tonight: PARTNER.tonight, dislikes: [], seen: [], shelves: [] });
  if (m.fits) return 'yes';
  const blockers = m.reasons.filter((r) => r.tone === 'no').length;
  return blockers === 1 && f.ed.scales.intensity <= 3 ? 'maybe' : 'no';
}

const VOTE_LABEL: Record<Vote, string> = { yes: 'Хочу', maybe: 'Можно', no: 'Нет' };

export function Jam({ open }: { open: boolean }) {
  const close = useUI((s) => s.close);
  const jam = useStore((s) => s.jam);
  const startJam = useStore((s) => s.startJam);
  const updateJam = useStore((s) => s.updateJam);
  const endJam = useStore((s) => s.endJam);
  const tonight = useStore((s) => s.tonight);
  const tickets = useStore((s) => s.tickets);

  // Simulated partner joins shortly after the session starts.
  useEffect(() => {
    if (!open || !jam || jam.partnerJoined) return;
    const id = window.setTimeout(() => {
      updateJam({ partnerJoined: true });
      toast(`${PARTNER.name} в сеансе — можно голосовать`);
    }, 1600);
    return () => window.clearTimeout(id);
  }, [open, jam, updateJam]);

  const candidates = useMemo(() => {
    const ctx = { tonight, dislikes: [], seen: [], shelves: [] };
    return FILMS.filter((f) => f.ed.availability.kind !== 'soon')
      .map((f) => {
        const mine = matchFilm(f, ctx);
        const theirs = matchFilm(f, { ...ctx, tonight: PARTNER.tonight });
        const bonus = tickets.includes(f.id) ? 3 : 0;
        return { f, score: mine.score + theirs.score + (mine.fits ? 2 : 0) + (theirs.fits ? 2 : 0) + bonus };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.f);
  }, [tonight, tickets]);

  const partnerVeto = useMemo(() => [...candidates].sort((a, b) => b.ed.scales.intensity + b.runtime / 60 - (a.ed.scales.intensity + a.runtime / 60))[0]?.id, [candidates]);

  const votes = jam?.votes ?? {};
  const votedAll = candidates.every((f) => votes[f.id]);
  const score = (f: Film) => {
    if (jam?.veto === f.id || partnerVeto === f.id) return -99;
    const v = { yes: 2, maybe: 1, no: -2 };
    return (votes[f.id] ? v[votes[f.id]] : 0) + v[partnerVote(f)];
  };
  const both = candidates.filter((f) => votes[f.id] === 'yes' && partnerVote(f) === 'yes' && jam?.veto !== f.id && partnerVeto !== f.id);
  const ranked = [...candidates].sort((a, b) => score(b) - score(a));
  const winner = both[0] ?? (votedAll ? ranked.find((f) => score(f) > 0) : undefined);

  const summary = (t: Tonight) =>
    [TIME_OPTIONS.find((o) => o.value === t.time)?.label, ENERGY_OPTIONS.find((o) => o.value === t.energy)?.label, t.wants.length ? `хочется ${t.wants.map((w) => EXPERIENCES[w].gen).join(' и ')}` : null]
      .filter(Boolean)
      .join(' · ') || 'вечер пока не описан';

  return (
    <Dialog open={open} onClose={close} title="Смотреть вместе" subtitle="Выбираем честно: каждый голосует сам, у каждого одно вето." kind="drawer">
      {!jam ? (
        <div className="jam-intro">
          <ul className="jam-rules">
            <li>
              <Heart aria-hidden="true" />
              <span>
                <strong>Голосуете отдельно.</strong> Голоса друг друга видны только после того, как вы проголосовали сами, — никто не подстраивается.
              </span>
            </li>
            <li>
              <Ban aria-hidden="true" />
              <span>
                <strong>Одно вето на вечер.</strong> Можно спокойно отклонить то, что точно не зайдёт, без долгих объяснений.
              </span>
            </li>
            <li>
              <Users aria-hidden="true" />
              <span>
                <strong>Если ничья — решает тот, чья очередь.</strong> Сегодня очередь второго участника: в прошлый раз выбирали вы.
              </span>
            </li>
          </ul>
          <button type="button" className="btn btn--primary btn--lg" onClick={startJam}>
            Начать совместный сеанс
          </button>
          <p className="jam-note">Демо: второй участник подключится автоматически.</p>
        </div>
      ) : (
        <div className="jam">
          <div className="jam__code">
            <span>
              Код сеанса <strong>{jam.code}</strong>
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                const url = `${location.origin}${location.pathname}#/?jam=${encodeURIComponent(jam.code)}`;
                navigator.clipboard?.writeText(url).then(
                  () => toast('Ссылка скопирована — отправьте её тому, с кем смотрите'),
                  () => toast('Не получилось скопировать — продиктуйте код'),
                );
              }}
            >
              <Copy aria-hidden="true" /> Скопировать ссылку
            </button>
          </div>

          <ul className="jam__people">
            <li>
              <span className="face face--lg" style={{ ['--h' as string]: 35 }} aria-hidden="true">
                Я
              </span>
              <span>
                <strong>Вы</strong>
                <span className="jam__wish">{summary(tonight)}</span>
              </span>
            </li>
            <li className={jam.partnerJoined ? '' : 'is-waiting'}>
              <span className="face face--lg" style={{ ['--h' as string]: PARTNER.hue }} aria-hidden="true">
                {PARTNER.name[0]}
              </span>
              <span>
                <span className="jam__who">
                  <strong>{PARTNER.name}</strong> <span className="demo-tag">демо</span>
                </span>
                <span className="jam__wish">{jam.partnerJoined ? summary(PARTNER.tonight) : 'подключается…'}</span>
              </span>
            </li>
          </ul>

          <h3 className="jam__h">Голосуйте</h3>
          <ul className="jam__list">
            {candidates.map((f) => {
              const mine = votes[f.id];
              const theirs = jam.partnerJoined && mine ? partnerVote(f) : null;
              const vetoed = jam.veto === f.id ? 'вы' : jam.partnerJoined && mine && partnerVeto === f.id ? PARTNER.name : null;
              return (
                <li key={f.id} className={`jam-film ${vetoed ? 'is-vetoed' : ''}`} style={{ ['--accent' as string]: f.ed.accent }}>
                  <Poster film={f} sizes="48px" className="jam-film__poster" />
                  <div className="jam-film__body">
                    <p className="jam-film__title">{f.title}</p>
                    <p className="jam-film__meta">
                      {formatRuntime(f.runtime)} · {f.ed.experiences.slice(0, 2).map((e) => EXPERIENCES[e].label).join(', ')}
                    </p>
                    <div className="jam-film__votes">
                      <Segmented<Vote | 'none'>
                        label={`Ваш голос за «${f.title}»`}
                        hideLabel
                        size="sm"
                        value={mine ?? 'none'}
                        onChange={(v) => v !== 'none' && updateJam({ votes: { ...(useStore.getState().jam?.votes ?? {}), [f.id]: v } })}
                        options={[
                          { value: 'yes', label: 'Хочу' },
                          { value: 'maybe', label: 'Можно' },
                          { value: 'no', label: 'Нет' },
                        ]}
                      />
                      <span className="jam-film__theirs" aria-live="polite">
                        {theirs ? (
                          <>
                            {PARTNER.name}: <strong className={`v-${theirs}`}>{VOTE_LABEL[theirs]}</strong>
                          </>
                        ) : jam.partnerJoined ? (
                          <span className="jam-film__hidden">голос {PARTNER.gen} откроется после вашего</span>
                        ) : null}
                      </span>
                    </div>
                    {vetoed && <p className="jam-film__veto">Вето: {vetoed}</p>}
                  </div>
                  <button
                    type="button"
                    className={`icon-btn jam-film__vetobtn ${jam.veto === f.id ? 'is-on' : ''}`}
                    aria-pressed={jam.veto === f.id}
                    aria-label={jam.veto === f.id ? `Снять вето с «${f.title}»` : `Наложить вето на «${f.title}»`}
                    title={jam.veto && jam.veto !== f.id ? 'Вето уже использовано — снимите его с другого фильма' : 'Одно вето на вечер'}
                    disabled={!!jam.veto && jam.veto !== f.id}
                    onClick={() => updateJam({ veto: jam.veto === f.id ? null : f.id })}
                  >
                    <Ban aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>

          <AnimatePresence mode="wait">
            {jam.partnerJoined && (both.length > 0 || votedAll) && (
              <motion.div key={winner?.id ?? 'none'} className="jam__result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} aria-live="polite">
                {winner ? (
                  <>
                    <p className="eyebrow">{both.includes(winner) ? 'Вы оба хотите' : `Компромисс · решающий голос у ${PARTNER.gen}`}</p>
                    <p className="jam__winner display">{winner.title}</p>
                    <p className="jam__why">{winner.ed.fitLine}</p>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={(e) => {
                        close();
                        openFilm(FILM_BY_ID.get(winner.id)!, e);
                      }}
                    >
                      Смотрим «{winner.title}»
                    </button>
                  </>
                ) : (
                  <p className="jam__why">Пока не совпало. Попробуйте поменять «Нет» на «Можно» там, где вы не против, — или возьмите билеты на другие фильмы.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            className="btn btn--quiet btn--sm jam__end"
            onClick={() => {
              endJam();
              toast('Совместный сеанс завершён');
            }}
          >
            Завершить сеанс
          </button>
        </div>
      )}
    </Dialog>
  );
}
