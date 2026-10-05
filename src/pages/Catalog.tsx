import { useMemo } from 'react';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { Dices, LayoutGrid, Rows3, Undo2 } from 'lucide-react';
import { FILMS } from '../data/films';
import { useStore } from '../store/useStore';
import { toast, useUI } from '../store/useUI';
import { isTonightActive, rankFilms } from '../lib/match';
import { countFilms, plural } from '../lib/format';
import { useNow } from '../lib/hooks';
import { TonightTuner } from '../components/TonightTuner';
import { FilmCase, SpineTable, openFilm } from '../components/FilmCase';
import { Segmented, Switch } from '../components/Controls';
import './Catalog.css';

export function Catalog() {
  const now = useNow();
  const tonight = useStore((s) => s.tonight);
  const dislikes = useStore((s) => s.dislikes);
  const seen = useStore((s) => s.seen);
  const shelves = useStore((s) => s.shelves);
  const dismissed = useStore((s) => s.dismissed);
  const view = useStore((s) => s.view);
  const sort = useStore((s) => s.sort);
  const setView = useStore((s) => s.setView);
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

  const title = active ? 'Подходит сегодня' : 'Афиша вечера';
  const summary = active
    ? fits.length
      ? `${countFilms(fits.length)} из ${FILMS.length - hidden.length} подходят под ваш вечер`
      : 'Ровно под такой вечер ничего нет — посмотрите, что почти подходит'
    : `${countFilms(fits.length + almost.length)}. Расскажите о вечере выше — подборка перестроится и объяснит выбор.`;

  return (
    <>
      <TonightTuner />

      <section className="results container" aria-labelledby="results-title">
        <div className="results__head">
          <div>
            <h2 id="results-title" className="results__title display">
              {title}
              {active && <span className="results__count">{fits.length}</span>}
            </h2>
            <p className="results__summary" aria-live="polite">
              {summary}
            </p>
          </div>
          <div className="results__tools">
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
                { value: 'fit', label: active ? 'По совпадению' : 'Подборка' },
                { value: 'runtime', label: 'Короче' },
                { value: 'rating', label: 'Рейтинг' },
              ]}
            />
            <Segmented
              label="Вид"
              hideLabel
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'cases', label: <><LayoutGrid aria-hidden="true" /><span className="results__vlabel">Обложки</span></>, title: 'Обложки' },
                { value: 'spines', label: <><Rows3 aria-hidden="true" /><span className="results__vlabel">Корешки</span></>, title: 'Корешки — компактный список для сравнения' },
              ]}
            />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={fits.length < 2}
              onClick={() => open({ type: 'roulette', pool: fits.map((m) => m.film.id) })}
              title="Не можете выбрать? Пусть решит случай"
            >
              <Dices aria-hidden="true" /> Решить за меня
            </button>
          </div>
        </div>

        {fromShelf.length > 0 && (
          <p className="results__nudge">
            <span className="results__nudge-dot" aria-hidden="true" />
            С ваших полок под этот вечер подходит:{' '}
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
          {view === 'cases' ? (
            <>
              {fits.length > 0 ? (
                <div className="grid">
                  <AnimatePresence mode="popLayout">
                    {fits.map((m, i) => (
                      <FilmCase key={m.film.id} match={m} now={now} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyFits />
              )}
              {almost.length > 0 && (
                <section className="almost" aria-labelledby="almost-title">
                  <h2 id="almost-title" className="almost__title">
                    {active ? 'Почти подходит' : 'Пока недоступно'}
                    <span className="almost__count">{almost.length}</span>
                  </h2>
                  <p className="almost__lead">
                    {active
                      ? 'Мы ничего не прячем молча. Под каждым фильмом — почему он не совпал с вашим вечером.'
                      : 'Эти фильмы скоро появятся или скрыты по вашим предпочтениям.'}
                  </p>
                  <div className="grid">
                    <AnimatePresence mode="popLayout">
                      {almost.map((m, i) => (
                        <FilmCase key={m.film.id} match={m} now={now} dim index={i} />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}
            </>
          ) : (
            <SpineTable matches={[...fits, ...almost]} now={now} caption={`${title}: сравнение фильмов`} />
          )}
        </LayoutGroup>

        {hidden.length > 0 && (
          <details className="hidden-films">
            <summary>
              Отложено и скрыто · {hidden.length}
              <span className="hidden-films__hint">всё можно вернуть</span>
            </summary>
            <ul>
              {hidden.map(({ match: m, dismissal: d }) => (
                <li key={m.film.id}>
                  <span className="hidden-films__name">«{m.film.title}»</span>
                  <span className="hidden-films__why">{d.kind === 'tonight' ? 'не сегодня — вернётся завтра' : d.reason.toLowerCase()}</span>
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
            Полутьма — прототип. Описания и оценки — из подготовленного набора данных (Кинопоиск, IMDb, фестивали), проверены 24 сентября 2026 года. Доступность, озвучка, отзывы друзей и «Подсказчик» — демонстрационные.
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
  if (tonight.wants.length) relax.push({ label: 'Убрать настроение', patch: { wants: [] } });
  if (typeof tonight.time === 'number') relax.push({ label: 'Не ограничивать время', patch: { time: null } });
  if (tonight.energy) relax.push({ label: 'Не учитывать силы', patch: { energy: null } });
  if (tonight.noExtraCost) relax.push({ label: 'Показать с доплатой', patch: { noExtraCost: false } });
  if (tonight.excludes.length) relax.push({ label: 'Снять исключения', patch: { excludes: [] } });
  return (
    <div className="empty">
      <p className="empty__title display">Под такой вечер ничего не нашлось.</p>
      <p className="empty__text">Это честный ответ: в каталоге {FILMS.length} {plural(FILMS.length, ['фильм', 'фильма', 'фильмов'])}. Ослабьте одно условие — или загляните в «Почти подходит» ниже.</p>
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
