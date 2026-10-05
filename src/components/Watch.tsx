import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Crown, KeyRound } from 'lucide-react';
import { FILM_BY_ID, FILMS } from '../data/films';
import { useUI, toast } from '../store/useUI';
import { formatRuntime, finishTime } from '../lib/format';
import { nearest } from '../lib/assistant';
import { Dialog } from './Overlay';
import { openFilm, Poster } from './Poster';
import './Watch.css';

/**
 * «Смотреть»: the lights go out and a classic film leader counts down 3-2-1.
 * A rare, celebratory moment — the one place where motion is allowed to linger.
 * The prototype has no player, and says so plainly.
 */
export function Watch({ open, filmId }: { open: boolean; filmId: number }) {
  const close = useUI((s) => s.close);
  const film = FILM_BY_ID.get(filmId);
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? 0 : 3);

  useEffect(() => {
    if (!open) return;
    setCount(reduce ? 0 : 3);
  }, [open, reduce, filmId]);

  useEffect(() => {
    if (!open || count <= 0) return;
    const id = window.setTimeout(() => setCount((c) => c - 1), 900);
    return () => window.clearTimeout(id);
  }, [open, count]);

  if (!film) return null;
  return (
    <Dialog open={open} onClose={close} title={`Сеанс: «${film.title}»`} size="lg" bare className="watch-dlg">
      <div className="watch" style={{ ['--accent' as string]: film.ed.accent }}>
        {count > 0 ? (
          <div className="leader" aria-live="assertive">
            <div className="leader__ring" key={count}>
              <span className="leader__sweep" />
            </div>
            <span className="leader__cross" aria-hidden="true" />
            <motion.span key={`n${count}`} className="leader__num" initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
              {count}
            </motion.span>
            <button type="button" className="btn btn--quiet btn--sm leader__skip" onClick={() => setCount(0)}>
              Пропустить
            </button>
          </div>
        ) : (
          <motion.div className="watch__done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <Poster film={film} sizes="160px" className="watch__poster" />
            <div className="watch__text">
              <p className="watch__title">{film.title}</p>
              <p className="watch__lead">
                Сеанс начался. Здесь шёл бы фильм — {formatRuntime(film.runtime)}, финальные титры около {finishTime(film.runtime)}. Это прототип: плеер не подключён.
              </p>
              <div className="watch__acts">
                {film.trailerUrl && (
                  <a className="btn btn--primary" href={film.trailerUrl} target="_blank" rel="noopener noreferrer">
                    Открыть страницу трейлера <ArrowUpRight aria-hidden="true" />
                    <span className="sr-only">(в новой вкладке)</span>
                  </a>
                )}
                <button type="button" className="btn btn--ghost" onClick={close}>
                  Вернуться в зал
                </button>
              </div>
              <p className="watch__hint">Приятного просмотра. Завтра можно отметить, совпали ли ожидания.</p>
            </div>
          </motion.div>
        )}
      </div>
    </Dialog>
  );
}

/** Premium / rent: never a dead end — always offer what you can watch right now. */
export function Paywall({ open, filmId }: { open: boolean; filmId: number }) {
  const close = useUI((s) => s.close);
  const film = FILM_BY_ID.get(filmId);
  if (!film) return null;
  const a = film.ed.availability;
  const included = nearest(film, 6)
    .filter((f) => f.ed.availability.kind === 'included')
    .slice(0, 2);
  const premiumCount = FILMS.filter((f) => f.ed.availability.kind === 'premium').length;
  return (
    <Dialog
      open={open}
      onClose={close}
      title={a.kind === 'rent' ? `Аренда «${film.title}»` : 'Подписка «Премиум»'}
      subtitle={a.kind === 'rent' ? 'Фильм не входит в подписку — его можно взять на 48 часов.' : `Открывает «${film.title}» и ещё ${premiumCount - 1} фильм из каталога.`}
      size="md"
    >
      <div className="pay">
        <div className="pay__plan">
          {a.kind === 'rent' ? <KeyRound aria-hidden="true" /> : <Crown aria-hidden="true" />}
          <div>
            <p className="pay__price">{a.kind === 'rent' ? `${a.price} ₽` : '399 ₽ / мес'}</p>
            <p className="pay__terms">{a.kind === 'rent' ? '48 часов с момента начала просмотра' : 'Первые 7 дней бесплатно, отменить можно в любой момент'}</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={() => {
            toast('В прототипе оплата не подключена — это демо сценария');
            close();
          }}
        >
          {a.kind === 'rent' ? `Арендовать за ${a.kind === 'rent' ? a.price : ''} ₽` : 'Попробовать 7 дней'}
        </button>
        {included.length > 0 && (
          <div className="pay__alt">
            <p className="pay__alt-h">Или посмотрите сегодня без доплат — похожее по ощущению:</p>
            <ul>
              {included.map((f) => (
                <li key={f.id}>
                  <a
                    href={`#/film/${f.slug}`}
                    onClick={(e) => {
                      close();
                      openFilm(f, e);
                    }}
                  >
                    «{f.title}»<span>, {formatRuntime(f.runtime)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
