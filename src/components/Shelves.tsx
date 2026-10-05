import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useStore, SOMEDAY, type Shelf } from '../store/useStore';
import { toast, useUI } from '../store/useUI';
import { FILM_BY_ID } from '../data/films';
import { matchFilm, isTonightActive } from '../lib/match';
import { suggestShelfNames } from '../lib/shelfNames';
import { formatRuntime, plural } from '../lib/format';
import { Dialog } from './Overlay';
import { Poster, openFilm } from './FilmCase';
import { TicketButton } from './FilmActions';
import './Shelves.css';

function savedAgo(at: number): string {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  return `${days} ${plural(days, ['день', 'дня', 'дней'])} назад`;
}

/** «Мои полки»: saved-for-later, each film with the reason it was saved. */
export function Shelves({ open }: { open: boolean }) {
  const close = useUI((s) => s.close);
  const shelves = useStore((s) => s.shelves);
  const createShelf = useStore((s) => s.createShelf);
  const total = shelves.reduce((n, s) => n + s.items.length, 0);
  const allFilms = shelves.flatMap((s) => s.items.map((i) => FILM_BY_ID.get(i.filmId)!));
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const suggestions = suggestShelfNames(allFilms);

  return (
    <Dialog open={open} onClose={close} title="Мои полки" subtitle="Билеты — на сегодня. Полки — на потом, с пометкой, чем фильм зацепил." kind="drawer">
      <div className="shelves">
        {total === 0 && (
          <div className="shelves__empty">
            <p>Пока пусто.</p>
            <p>Нажмите на закладку у любого фильма, чтобы отложить его. Мы запомним, почему он вас заинтересовал, и напомним, когда он подойдёт под вечер.</p>
          </div>
        )}
        {shelves.map((s) => (
          <ShelfBlock key={s.id} shelf={s} />
        ))}

        {adding ? (
          <form
            className="shelves__new"
            onSubmit={(e) => {
              e.preventDefault();
              const n = name.trim() || suggestions[0];
              createShelf(n);
              toast(`Полка «${n}» создана`);
              setName('');
              setAdding(false);
            }}
          >
            <label htmlFor="new-shelf" className="sr-only">
              Название полки
            </label>
            <input id="new-shelf" className="menu__input" value={name} onChange={(e) => setName(e.target.value)} placeholder={suggestions[0]} autoFocus />
            <div className="menu__suggest">
              <span>Подсказки:</span>
              {suggestions.map((n) => (
                <button key={n} type="button" className="menu__suggestion" onClick={() => setName(n)}>
                  {n}
                </button>
              ))}
            </div>
            <div className="shelves__new-acts">
              <button type="button" className="btn btn--quiet btn--sm" onClick={() => setAdding(false)}>
                Отмена
              </button>
              <button type="submit" className="btn btn--primary btn--sm">
                Создать
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn btn--ghost shelves__add" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" /> Новая полка
          </button>
        )}
      </div>
    </Dialog>
  );
}

function ShelfBlock({ shelf }: { shelf: Shelf }) {
  const close = useUI((s) => s.close);
  const tonight = useStore((s) => s.tonight);
  const ctx = { tonight, dislikes: useStore((s) => s.dislikes), seen: useStore((s) => s.seen), shelves: [] };
  const removeFromShelf = useStore((s) => s.removeFromShelf);
  const renameShelf = useStore((s) => s.renameShelf);
  const deleteShelf = useStore((s) => s.deleteShelf);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shelf.name);
  const active = isTonightActive(tonight);

  return (
    <section className="shelf" aria-label={`Полка «${shelf.name}»`}>
      <header className="shelf__head">
        {editing ? (
          <form
            className="shelf__rename"
            onSubmit={(e) => {
              e.preventDefault();
              renameShelf(shelf.id, name.trim() || shelf.name);
              setEditing(false);
            }}
          >
            <label className="sr-only" htmlFor={`rename-${shelf.id}`}>
              Новое название
            </label>
            <input id={`rename-${shelf.id}`} className="menu__input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button type="submit" className="icon-btn" aria-label="Сохранить название">
              <Check aria-hidden="true" />
            </button>
          </form>
        ) : (
          <>
            <h3 className="shelf__name">
              {shelf.name} <span className="shelf__count">{shelf.items.length}</span>
            </h3>
            <button type="button" className="icon-btn" aria-label={`Переименовать полку «${shelf.name}»`} onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
            </button>
            {shelf.id !== SOMEDAY && (
              <button
                type="button"
                className="icon-btn"
                aria-label={`Удалить полку «${shelf.name}»`}
                onClick={() => {
                  const snapshot = useStore.getState().shelves;
                  deleteShelf(shelf.id);
                  toast(`Полка «${shelf.name}» удалена`, { label: 'Отменить', run: () => useStore.setState({ shelves: snapshot }) });
                }}
              >
                <Trash2 aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </header>
      {shelf.items.length === 0 ? (
        <p className="shelf__empty">Здесь пока ничего нет.</p>
      ) : (
        <ul className="shelf__items">
          {shelf.items.map((it) => {
            const f = FILM_BY_ID.get(it.filmId);
            if (!f) return null;
            const m = active ? matchFilm(f, ctx) : null;
            return (
              <li key={it.filmId} className="shelf-item" style={{ ['--accent' as string]: f.ed.accent }}>
                <a
                  href={`#/film/${f.slug}`}
                  className="shelf-item__link"
                  onClick={(e) => {
                    close();
                    openFilm(f, e);
                  }}
                >
                  <Poster film={f} sizes="56px" className="shelf-item__poster" />
                  <span className="shelf-item__body">
                    <span className="shelf-item__title">{f.title}</span>
                    <span className="shelf-item__meta">
                      {formatRuntime(f.runtime)} · сохранено {savedAgo(it.at)}
                    </span>
                    {it.reason && <span className="shelf-item__reason">{it.reason}</span>}
                    {m && <span className={`shelf-item__fit ${m.fits ? 'is-yes' : ''}`}>{m.fits ? '✓ подходит под сегодняшний вечер' : `✕ ${m.reasons.find((r) => r.tone === 'no')?.text ?? 'не сегодня'}`}</span>}
                  </span>
                </a>
                <div className="shelf-item__acts">
                  <TicketButton film={f} />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Убрать «${f.title}» с полки`}
                    onClick={() => {
                      removeFromShelf(f.id, shelf.id);
                      toast(`«${f.title}» убран с полки`, { label: 'Вернуть', run: () => useStore.getState().saveToShelf(f.id, shelf.id, it.reason) });
                    }}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
