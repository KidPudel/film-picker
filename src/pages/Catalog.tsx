import { useEffect, useMemo } from 'react';
import { LayoutGroup } from 'motion/react';
import { Dices, Undo2 } from 'lucide-react';
import { FILMS } from '../data/films';
import { useStore } from '../store/useStore';
import { toast, useUI } from '../store/useUI';
import { isTonightActive, rankFilms } from '../lib/match';
import { countFilms, plural } from '../lib/format';
import { useNow } from '../lib/hooks';
import { TonightTuner } from '../components/TonightTuner';
import { Schedule, SessionLegend } from '../components/Schedule';
import { Seats } from '../components/Seats';
import { filmFrame, openFilm } from '../components/Poster';
import { HOUSE, useProjector } from '../store/useProjector';
import { Segmented, Switch } from '../components/Controls';
import './Catalog.css';

export function Catalog() {
  const now = useNow();
  const tonight = useStore((s) => s.tonight);
  const dislikes = useStore((s) => s.dislikes);
  const seen = useStore((s) => s.seen);
  const shelves = useStore((s) => s.shelves);
  const dismissed = useStore((s) => s.dismissed);
  const sort = useStore((s) => s.sort);
  const setSort = useStore((s) => s.setSort);
  const setTonight = useStore((s) => s.setTonight);
  const undismiss = useStore((s) => s.undismiss);
  const open = useUI((s) => s.open);

  const active = isTonightActive(tonight);
  const ranked = useMemo(
    () => rankFilms(FILMS, { tonight, dislikes, seen, shelves, now }, dismissed, sort),
    // `now` changes once a minute — fine to recompute.
    [tonight, dislikes, seen, shelves, now, dismissed, sort],
  );
  const { fits, almost, hidden } = ranked;
  const fromShelf = active ? fits.filter((m) => shelves.some((s) => s.items.some((i) => i.filmId === m.film.id))) : [];
  const shown = FILMS.length - hidden.length;

  // The hall takes on the film that fits tonight best; with no evening set, the house light.
  const lead = active ? fits[0]?.film : undefined;
  useEffect(() => {
    useProjector.getState().setFrame(lead ? filmFrame(lead) : HOUSE);
  }, [lead]);

  const title = active ? 'Подходит сегодня' : 'Афиша на вечер';
  const summary = active
    ? fits.length
      ? `${countFilms(fits.length)} из ${shown} подходят под ваш вечер.`
      : 'Ровно под такой вечер ничего нет. Ниже — что почти подходит и почему.'
    : `${countFilms(fits.length + almost.length)}. Расскажите о вечере выше — афиша перестроится и объяснит выбор.`;

  return (
    <>
      <section className="hall-hero">
        <div className="container hall-hero__inner">
          <TonightTuner />
        </div>
        <Seats className="hall-hero__seats" />
      </section>

      <section className="afisha container" aria-labelledby="afisha-title">
        <header className="afisha__head">
          <div className="afisha__titles">
            <h2 id="afisha-title" className="afisha__title">
              {title}
              {active && (
                <span className="afisha__count">
                  {fits.length}
                  <span className="afisha__of"> из {shown}</span>
                </span>
              )}
            </h2>
            <p className="afisha__summary" aria-live="polite">
              {summary}
            </p>
            <SessionLegend now={now} />
          </div>
          <div className="afisha__tools">
            <Switch checked={tonight.noExtraCost} onChange={(v) => setTonight({ noExtraCost: v })}>
              Без доплат
            </Switch>
            <Segmented
              label="Порядок"
              hideLabel
              size="sm"
              value={sort}
              onChange={setSort}
              options={[
                { value: 'fit', label: active ? 'Лучше подходит' : 'Подборка' },
                { value: 'runtime', label: 'Короче' },
                { value: 'rating', label: 'Оценка' },
              ]}
            />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={fits.length < 2}
              onClick={() => open({ type: 'roulette', pool: fits.map((m) => m.film.id) })}
            >
              <Dices aria-hidden="true" /> Решить за меня
            </button>
          </div>
        </header>

        {fromShelf.length > 0 && (
          <p className="afisha__nudge">
            С ваших полок под этот вечер подходит{' '}
            {fromShelf.map((m, i) => (
              <span key={m.film.id}>
                {i > 0 && ', '}
                <a href={`#/film/${m.film.slug}`} onClick={(e) => openFilm(m.film, e)}>
                  «{m.film.title}»
                </a>
              </span>
            ))}
            . Самое время вернуться к сохранённому.
          </p>
        )}

        <LayoutGroup>
          {fits.length > 0 ? <Schedule matches={fits} now={now} label={title} /> : <EmptyFits />}

          {almost.length > 0 && (
            <section className="almost" aria-labelledby="almost-title">
              <h2 id="almost-title" className="almost__title">
                {active ? 'Почти подходит' : 'Пока не посмотреть'}
                <span className="afisha__count afisha__count--quiet">{almost.length}</span>
              </h2>
              <p className="almost__lead">
                {active
                  ? 'Ничего не прячем молча: у каждого фильма написано, чем он не совпал с вашим вечером.'
                  : 'Эти фильмы скоро появятся или вы просили показывать их реже.'}
              </p>
              <Schedule matches={almost} now={now} dim label={active ? 'Почти подходит' : 'Пока не посмотреть'} />
            </section>
          )}
        </LayoutGroup>

        {hidden.length > 0 && (
          <details className="hidden-films">
            <summary>
              <span>Отложено и скрыто: {hidden.length}</span>
              <span className="hidden-films__hint">всё можно вернуть</span>
            </summary>
            <ul>
              {hidden.map(({ match: m, dismissal: d }) => (
                <li key={m.film.id}>
                  <span className="hidden-films__name">«{m.film.title}»</span>
                  <span className="hidden-films__why">{d.kind === 'tonight' ? 'не сегодня, вернётся завтра' : d.reason.toLowerCase()}</span>
                  <button
                    type="button"
                    className="btn btn--quiet btn--sm"
                    onClick={() => {
                      undismiss(m.film.id);
                      toast(`«${m.film.title}» снова в афише`);
                    }}
                  >
                    <Undo2 aria-hidden="true" /> Вернуть
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        <footer className="colophon">
          <p>
            Прототип. Описания, оценки и награды — из подготовленного набора данных (Кинопоиск, IMDb, фестивали), проверены 24 сентября 2026 года.
            Кадры — The Movie Database (TMDB). Доступность и цены, озвучка, отзывы друзей, «Смотреть вместе» и «Подсказчик» — демонстрационные.
          </p>
        </footer>
      </section>
    </>
  );
}

function EmptyFits() {
  const tonight = useStore((s) => s.tonight);
  const setTonight = useStore((s) => s.setTonight);
  const relax: { label: string; patch: Parameters<typeof setTonight>[0] }[] = [];
  if (tonight.wants.length) relax.push({ label: 'Не учитывать настроение', patch: { wants: [] } });
  if (typeof tonight.time === 'number') relax.push({ label: 'Не ограничивать время', patch: { time: null } });
  if (tonight.energy) relax.push({ label: 'Не учитывать силы', patch: { energy: null } });
  if (tonight.noExtraCost) relax.push({ label: 'Показать с доплатой', patch: { noExtraCost: false } });
  if (tonight.excludes.length) relax.push({ label: 'Снять исключения', patch: { excludes: [] } });
  return (
    <div className="empty">
      <p className="empty__title">Под такой вечер ничего не нашлось</p>
      <p className="empty__text">
        Это честный ответ: в каталоге {FILMS.length} {plural(FILMS.length, ['фильм', 'фильма', 'фильмов'])}. Ослабьте одно условие или посмотрите, что почти подходит.
      </p>
      <div className="empty__actions">
        {relax.map((r) => (
          <button key={r.label} type="button" className="chip" onClick={() => setTonight(r.patch)}>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
