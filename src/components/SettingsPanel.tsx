import { X } from 'lucide-react';
import { useStore, type Dislike } from '../store/useStore';
import { SPOILER_LEVELS, type SpoilerLevel } from '../data/vocab';
import { Segmented, SwitchRow } from './Controls';
import { toast, useUI } from '../store/useUI';
import { Dialog } from './Overlay';
import './SettingsPanel.css';

const dislikeLabel = (d: Dislike) =>
  d.kind === 'bw' ? 'Чёрно-белое кино' : d.kind === 'subs' ? 'Фильмы только с субтитрами' : d.value;

export function SpoilerControl({ compact }: { compact?: boolean }) {
  const spoiler = useStore((s) => s.spoiler);
  const setSpoiler = useStore((s) => s.setSpoiler);
  return (
    <div className="spoiler-ctl">
      <Segmented<SpoilerLevel>
        label="Сколько рассказывать о сюжете"
        size={compact ? 'sm' : 'md'}
        value={spoiler}
        options={SPOILER_LEVELS.map((l) => ({ value: l.value, label: l.label, title: l.hint }))}
        onChange={setSpoiler}
      />
      <p className="spoiler-ctl__hint" aria-live="polite">
        {SPOILER_LEVELS[spoiler].hint}
      </p>
    </div>
  );
}

/** «Настройки»: a sheet with plain rows. Everything is stored only in this browser. */
export function Settings({ open }: { open: boolean }) {
  const close = useUI((s) => s.close);
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const dislikes = useStore((s) => s.dislikes);
  const removeDislike = useStore((s) => s.removeDislike);
  const resetAll = useStore((s) => s.resetAll);

  return (
    <Dialog open={open} onClose={close} title="Настройки" subtitle="Хранятся только в этом браузере." kind="drawer">
      <div className="settings">
        <section className="settings__group" aria-labelledby="set-spoil">
          <h3 id="set-spoil" className="settings__h">
            Спойлеры
          </h3>
          <SpoilerControl />
        </section>

        <section className="settings__group" aria-labelledby="set-view">
          <h3 id="set-view" className="settings__h">
            Как показывать
          </h3>
          <div className="settings__rows">
            <SwitchRow label="Свет в зале" hint="Светлая тема для яркой комнаты; проектор гаснет" checked={prefs.theme === 'light'} onChange={(v) => setPrefs({ theme: v ? 'light' : 'dark' })} />
            <SwitchRow label="Крупный текст" checked={prefs.text === 'large'} onChange={(v) => setPrefs({ text: v ? 'large' : 'normal' })} />
            <SwitchRow label="Повышенный контраст" checked={prefs.contrast === 'more'} onChange={(v) => setPrefs({ contrast: v ? 'more' : 'normal' })} />
            <SwitchRow
              label="Меньше движения"
              hint="Свет замирает, кадры не сменяются сами, переходы без анимации"
              checked={prefs.motion === 'reduce'}
              onChange={(v) => setPrefs({ motion: v ? 'reduce' : 'system' })}
            />
          </div>
        </section>

        <section className="settings__group" aria-labelledby="set-less">
          <h3 id="set-less" className="settings__h">
            Показывать реже
          </h3>
          {dislikes.length === 0 ? (
            <p className="settings__empty">Пока ничего. Список пополнится, когда вы объясните через «Не то», почему фильм не подходит.</p>
          ) : (
            <ul className="settings__list">
              {dislikes.map((d) => (
                <li key={`${d.kind}-${'value' in d ? d.value : ''}`}>
                  <span>{dislikeLabel(d)}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Убрать «${dislikeLabel(d)}» из списка`}
                    onClick={() => {
                      removeDislike(d);
                      toast(`«${dislikeLabel(d)}» снова в подборке`, { label: 'Отменить', run: () => useStore.getState().addDislike(d) });
                    }}
                  >
                    <X aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="settings__group" aria-labelledby="set-data">
          <h3 id="set-data" className="settings__h">
            Ваши данные
          </h3>
          <p className="settings__empty">Полки, билеты, отметки и настройки хранятся в этом браузере и никуда не отправляются.</p>
          <button
            type="button"
            className="btn btn--ghost btn--sm settings__reset"
            onClick={() => {
              const snapshot = useStore.getState();
              resetAll();
              toast('Всё сброшено — начинаем с чистого листа', {
                label: 'Вернуть',
                run: () =>
                  useStore.setState({
                    tonight: snapshot.tonight,
                    tickets: snapshot.tickets,
                    shelves: snapshot.shelves,
                    dismissed: snapshot.dismissed,
                    seen: snapshot.seen,
                    dislikes: snapshot.dislikes,
                    reminders: snapshot.reminders,
                    spoiler: snapshot.spoiler,
                    prefs: snapshot.prefs,
                    sort: snapshot.sort,
                    jam: snapshot.jam,
                  }),
              });
            }}
          >
            Сбросить всё
          </button>
        </section>
      </div>
    </Dialog>
  );
}
