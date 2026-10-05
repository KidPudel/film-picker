import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronRight, Plus, ThumbsDown } from 'lucide-react';
import type { Film } from '../data/types';
import { useStore, SOMEDAY, type Dislike } from '../store/useStore';
import { toast, useUI } from '../store/useUI';
import { FILM_BY_ID } from '../data/films';
import { SAVE_REASONS } from '../data/vocab';
import { suggestShelfNames } from '../lib/shelfNames';
import { hasVoiceover } from '../lib/match';
import { eveningKey } from '../lib/format';
import { Popover } from './Overlay';
import { TicketIcon } from './TicketIcon';
import './FilmActions.css';

type Variant = 'icon' | 'full';

// ─── 🎟 На сегодня ─────────────────────────────────────────────────────────

export function TicketButton({ film, variant = 'icon' }: { film: Film; variant?: Variant }) {
  const has = useStore((s) => s.tickets.includes(film.id));
  const toggleTicket = useStore((s) => s.toggleTicket);
  const openOverlay = useUI((s) => s.open);
  const soon = film.ed.availability.kind === 'soon';

  const onClick = () => {
    const r = toggleTicket(film.id);
    if (r === 'added') toast(`«${film.title}» — в билетах на вечер`, { label: 'Отменить', run: () => useStore.getState().removeTicket(film.id) });
    if (r === 'removed') toast(`Билет на «${film.title}» убран`, { label: 'Вернуть', run: () => useStore.getState().toggleTicket(film.id) });
    if (r === 'full') toast('Билетов уже три — сравните их или уберите один', { label: 'Сравнить', run: () => openOverlay({ type: 'compare' }) });
  };

  if (soon) return null;

  return (
    <button
      type="button"
      className={`act act--ticket act--${variant} ${has ? 'is-on' : ''}`}
      aria-pressed={has}
      aria-label={variant === 'icon' ? `На сегодня: «${film.title}»` : undefined}
      title={variant === 'icon' ? (has ? 'Убрать из билетов на вечер' : 'Взять билет на сегодня') : undefined}
      onClick={onClick}
    >
      <TicketIcon filled={has} />
      {variant === 'full' && <span>{has ? 'Билет на сегодня' : 'На сегодня'}</span>}
    </button>
  );
}

// ─── 🔖 На полку ──────────────────────────────────────────────────────────

export function ShelfButton({ film, variant = 'icon' }: { film: Film; variant?: Variant }) {
  const shelves = useStore((s) => s.shelves);
  const onShelf = shelves.find((s) => s.items.some((i) => i.filmId === film.id));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const Icon = onShelf ? BookmarkCheck : Bookmark;
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`act act--shelf act--${variant} ${onShelf ? 'is-on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={variant === 'icon' ? `На полку: «${film.title}»${onShelf ? `, сейчас на полке «${onShelf.name}»` : ''}` : undefined}
        title={variant === 'icon' ? (onShelf ? `На полке «${onShelf.name}»` : 'Сохранить на потом') : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon aria-hidden="true" />
        {variant === 'full' && <span>{onShelf ? `На полке «${onShelf.name}»` : 'На полку'}</span>}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} label={`Сохранить «${film.title}» на потом`} width={380}>
        <ShelfMenu film={film} onDone={() => setOpen(false)} />
      </Popover>
    </>
  );
}

function ShelfMenu({ film, onDone }: { film: Film; onDone: () => void }) {
  const shelves = useStore((s) => s.shelves);
  const saveToShelf = useStore((s) => s.saveToShelf);
  const createShelf = useStore((s) => s.createShelf);
  const removeFromShelf = useStore((s) => s.removeFromShelf);
  const current = shelves.find((s) => s.items.some((i) => i.filmId === film.id));
  const [reason, setReason] = useState<string | undefined>(current?.items.find((i) => i.filmId === film.id)?.reason);
  const [shelfId, setShelfId] = useState<string>(current?.id ?? SOMEDAY);
  const [newName, setNewName] = useState('');

  const target = shelves.find((s) => s.id === shelfId);
  const suggestionsFor = shelfId === 'new' ? suggestShelfNames([film], reason) : [];

  const save = () => {
    let id = shelfId;
    let name = target?.name ?? '';
    if (shelfId === 'new') {
      name = newName.trim() || suggestionsFor[0];
      id = createShelf(name);
    }
    if (current && current.id !== id) removeFromShelf(film.id, current.id);
    saveToShelf(film.id, id, reason);
    toast(`«${film.title}» на полке «${name}»`, {
      label: 'Отменить',
      run: () => useStore.getState().removeFromShelf(film.id, id),
    });
    onDone();
  };

  return (
    <div className="menu">
      <p className="menu__title">На потом</p>
      <p className="menu__lead">Билет — на сегодня, полка — на потом. Отметьте, чем фильм зацепил: так будет проще вернуться к нему в нужный вечер.</p>

      <fieldset className="menu__group">
        <legend className="menu__legend">Почему сохраняете · по желанию</legend>
        <div className="menu__chips">
          {SAVE_REASONS.map((r) => (
            <button key={r} type="button" className="chip" aria-pressed={reason === r} onClick={() => setReason(reason === r ? undefined : r)}>
              {r}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="menu__group">
        <legend className="menu__legend">Полка</legend>
        <div className="menu__shelves" role="radiogroup" aria-label="Полка">
          {shelves.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={shelfId === s.id} className="shelf-opt" onClick={() => setShelfId(s.id)}>
              <span className="shelf-opt__dot" aria-hidden="true" />
              <span className="shelf-opt__name">{s.name}</span>
              <span className="shelf-opt__count">{s.items.length}</span>
            </button>
          ))}
          <button type="button" role="radio" aria-checked={shelfId === 'new'} className="shelf-opt" onClick={() => setShelfId('new')}>
            <Plus className="shelf-opt__plus" aria-hidden="true" />
            <span className="shelf-opt__name">Новая полка</span>
          </button>
        </div>
        {shelfId === 'new' && (
          <div className="menu__new">
            <label className="sr-only" htmlFor={`shelf-name-${film.id}`}>
              Название новой полки
            </label>
            <input
              id={`shelf-name-${film.id}`}
              className="menu__input"
              placeholder={suggestionsFor[0]}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <div className="menu__suggest">
              <span>Подсказки:</span>
              {suggestionsFor.map((n) => (
                <button key={n} type="button" className="menu__suggestion" onClick={() => setNewName(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <div className="menu__foot">
        {current && (
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={() => {
              removeFromShelf(film.id, current.id);
              toast(`«${film.title}» убран с полки`, { label: 'Вернуть', run: () => useStore.getState().saveToShelf(film.id, current.id, reason) });
              onDone();
            }}
          >
            Убрать с полки
          </button>
        )}
        <button type="button" className="btn btn--primary btn--sm" onClick={save}>
          Сохранить{shelfId === 'new' ? ' на новую полку' : target ? ` на «${target.name}»` : ''}
        </button>
      </div>
    </div>
  );
}

// ─── 👎 Не то ──────────────────────────────────────────────────────────────

export function NotThisButton({ film, variant = 'icon' }: { film: Film; variant?: Variant }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`act act--not act--${variant}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={variant === 'icon' ? `Не то: «${film.title}»` : undefined}
        title={variant === 'icon' ? 'Не подходит? Расскажите почему' : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <ThumbsDown aria-hidden="true" />
        {variant === 'full' && <span>Не то</span>}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} label={`Почему «${film.title}» не подходит`} width={360}>
        <NotThisMenu film={film} onDone={() => setOpen(false)} />
      </Popover>
    </>
  );
}

type Step = 'root' | 'why' | 'actor' | 'genre';

function NotThisMenu({ film, onDone }: { film: Film; onDone: () => void }) {
  const [step, setStep] = useState<Step>('root');
  const dismiss = useStore((s) => s.dismiss);
  const addDislike = useStore((s) => s.addDislike);
  const toggleSeen = useStore((s) => s.toggleSeen);
  const seen = useStore((s) => s.seen.includes(film.id));
  const heading = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (step !== 'root') heading.current?.focus();
  }, [step]);

  const never = (reason: string, dislike?: Dislike, message?: string) => {
    const tickets = useStore.getState().tickets;
    dismiss(film.id, { kind: 'never', reason, at: Date.now() });
    if (dislike) addDislike(dislike);
    toast(message ?? `Скрыли «${film.title}»`, {
      label: 'Отменить',
      run: () => {
        const s = useStore.getState();
        s.undismiss(film.id);
        if (dislike) s.removeDislike(dislike);
        if (tickets.includes(film.id)) useStore.setState({ tickets });
      },
    });
    onDone();
  };

  const Item = ({ label, hint, onClick, more }: { label: string; hint?: string; onClick: () => void; more?: boolean }) => (
    <li>
      <button type="button" className="optlist__item" onClick={onClick}>
        <span className="optlist__label">{label}</span>
        {hint && <span className="optlist__hint">{hint}</span>}
        {more && <ChevronRight className="optlist__check" aria-hidden="true" />}
      </button>
    </li>
  );

  const Back = () => (
    <button type="button" className="btn btn--quiet btn--sm menu__back" onClick={() => setStep(step === 'why' ? 'root' : 'why')}>
      <ArrowLeft aria-hidden="true" /> Назад
    </button>
  );

  if (step === 'root')
    return (
      <div className="menu">
        <p className="menu__title">Почему не подходит?</p>
        <p className="menu__lead">Это не оценка фильма. Всё можно вернуть.</p>
        <ul className="optlist" role="list">
          <Item
            label="Не сегодня"
            hint="Спрячем до завтра"
            onClick={() => {
              const tickets = useStore.getState().tickets;
              dismiss(film.id, { kind: 'tonight', evening: eveningKey() });
              toast(`«${film.title}» отложен до завтра`, {
                label: 'Отменить',
                run: () => {
                  useStore.getState().undismiss(film.id);
                  useStore.setState({ tickets });
                },
              });
              onDone();
            }}
          />
          <Item
            label={seen ? 'Снять отметку «уже смотрено»' : 'Уже смотрено'}
            hint={seen ? undefined : 'Оставим в подборке — вдруг захочется пересмотреть'}
            onClick={() => {
              toggleSeen(film.id);
              toast(seen ? 'Отметка снята' : `Отметили: «${film.title}» уже смотрено`, { label: 'Отменить', run: () => useStore.getState().toggleSeen(film.id) });
              onDone();
            }}
          />
          <Item label="Не интересно" hint="Расскажите, что именно, — будем точнее" onClick={() => setStep('why')} more />
        </ul>
      </div>
    );

  if (step === 'why')
    return (
      <div className="menu">
        <Back />
        <p className="menu__title" tabIndex={-1} ref={heading}>
          Что именно не так?
        </p>
        <ul className="optlist" role="list">
          <Item label="Тема или сюжет" hint="Скроем только этот фильм" onClick={() => never('Тема или сюжет')} />
          {film.directors.map((d) => (
            <Item key={d} label={`Режиссёр: ${d}`} hint="Будем реже предлагать его фильмы" onClick={() => never(`Режиссёр: ${d}`, { kind: 'director', value: d }, `Будем реже предлагать фильмы: ${d}`)} />
          ))}
          {film.cast.length > 0 && <Item label="Кто-то из актёров" onClick={() => setStep('actor')} more />}
          <Item label="Жанр" hint={film.genres.join(', ')} onClick={() => setStep('genre')} more />
          {film.isBW && <Item label="Чёрно-белое изображение" onClick={() => never('Чёрно-белое', { kind: 'bw' }, 'Будем реже предлагать чёрно-белое кино')} />}
          {!hasVoiceover(film) && <Item label="Только с субтитрами" onClick={() => never('Только субтитры', { kind: 'subs' }, 'Будем реже предлагать фильмы без озвучки')} />}
          {film.runtime > 120 && <Item label="Слишком длинный" hint="Подсказка: время можно задать в предложении сверху" onClick={() => never('Слишком длинный')} />}
          {film.ed.scales.intensity >= 4 && <Item label="Слишком тяжёлый" onClick={() => never('Слишком тяжёлый')} />}
          <Item label="Просто не моё" onClick={() => never('Не моё')} />
        </ul>
      </div>
    );

  const list = step === 'actor' ? film.cast.slice(0, 6).map((c) => c.name_ru) : film.genres;
  return (
    <div className="menu">
      <Back />
      <p className="menu__title" tabIndex={-1} ref={heading}>
        {step === 'actor' ? 'Кто именно?' : 'Какой жанр?'}
      </p>
      <ul className="optlist" role="list">
        {list.map((v) => (
          <Item
            key={v}
            label={v}
            hint={step === 'actor' ? film.cast.find((c) => c.name_ru === v)?.role ?? undefined : undefined}
            onClick={() => never(`${step === 'actor' ? 'Актёр' : 'Жанр'}: ${v}`, { kind: step, value: v } as Dislike, `Будем реже предлагать: ${v}`)}
          />
        ))}
      </ul>
    </div>
  );
}

export const filmById = (id: number) => FILM_BY_ID.get(id)!;
