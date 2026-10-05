import { Lamp, LampDesk, X } from 'lucide-react';
import { useStore, type Dislike } from '../store/useStore';
import { SPOILER_LEVELS, type SpoilerLevel } from '../data/vocab';
import { Segmented } from './Controls';
import { toast } from '../store/useUI';
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

export function SettingsPanel() {
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const dislikes = useStore((s) => s.dislikes);
  const removeDislike = useStore((s) => s.removeDislike);
  const resetAll = useStore((s) => s.resetAll);

  return (
    <div className="settings">
      <h2 className="settings__title">Как показывать</h2>
      <SpoilerControl />

      <Segmented
        label="Свет в зале"
        value={prefs.theme}
        options={[
          { value: 'dark', label: <><LampDesk aria-hidden="true" /> Погашен</> },
          { value: 'light', label: <><Lamp aria-hidden="true" /> Включён</> },
        ]}
        onChange={(theme) => setPrefs({ theme })}
      />
      <div className="settings__row">
        <Segmented
          label="Текст"
          size="sm"
          value={prefs.text}
          options={[
            { value: 'normal', label: 'Обычный' },
            { value: 'large', label: 'Крупнее' },
          ]}
          onChange={(text) => setPrefs({ text })}
        />
        <Segmented
          label="Движение"
          size="sm"
          value={prefs.motion}
          options={[
            { value: 'system', label: 'Как в системе' },
            { value: 'reduce', label: 'Меньше' },
          ]}
          onChange={(motion) => setPrefs({ motion })}
        />
      </div>
      <Segmented
        label="Контраст"
        size="sm"
        value={prefs.contrast}
        options={[
          { value: 'normal', label: 'Обычный' },
          { value: 'more', label: 'Повышенный' },
        ]}
        onChange={(contrast) => setPrefs({ contrast })}
      />

      <div className="settings__dislikes">
        <h3 className="seg__label">Вы просили показывать реже</h3>
        {dislikes.length === 0 ? (
          <p className="settings__empty">Пока ничего. Это появится, когда вы объясните через «Не то», почему фильм не подходит.</p>
        ) : (
          <ul>
            {dislikes.map((d) => (
              <li key={`${d.kind}-${'value' in d ? d.value : ''}`}>
                <span>{dislikeLabel(d)}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Убрать «${dislikeLabel(d)}» из списка`}
                  onClick={() => {
                    removeDislike(d);
                    toast(`«${dislikeLabel(d)}» снова в подборке`);
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="btn btn--quiet btn--sm settings__reset"
        onClick={() => {
          if (window.confirm('Сбросить полки, билеты, отметки и настройки? Это нельзя отменить.')) {
            resetAll();
            toast('Всё сброшено — начинаем с чистого листа');
          }
        }}
      >
        Сбросить все мои данные
      </button>
      <p className="settings__note">Всё хранится только в этом браузере.</p>
    </div>
  );
}
