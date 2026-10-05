import { useEffect, useRef, useState } from 'react';
import { Library, SlidersHorizontal, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { navigate, useRoute } from '../lib/router';
import { Popover } from './Overlay';
import { SettingsPanel } from './SettingsPanel';
import './Header.css';

export function Header() {
  const route = useRoute();
  const shelves = useStore((s) => s.shelves);
  const jam = useStore((s) => s.jam);
  const open = useUI((s) => s.open);
  const saved = shelves.reduce((n, s) => n + s.items.length, 0);
  const settingsBtn = useRef<HTMLButtonElement>(null);
  const [settings, setSettings] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className={`hdr ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="hdr__inner container">
        <a
          className="hdr__brand"
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
          aria-current={route.name === 'catalog' ? 'page' : undefined}
        >
          Кино на вечер
        </a>

        <nav className="hdr__nav" aria-label="Основное">
          <button type="button" className="hdr__link" onClick={() => open({ type: 'shelves' })}>
            <Library aria-hidden="true" />
            <span className="hdr__label">Мои полки</span>
            {saved > 0 && (
              <span className="hdr__count">
                <span className="sr-only">, сохранено: </span>
                {saved}
              </span>
            )}
          </button>
          <button type="button" className="hdr__link" onClick={() => open({ type: 'jam' })}>
            <Users aria-hidden="true" />
            <span className="hdr__label">Смотреть вместе</span>
            {jam && (
              <span className="hdr__live">
                <span className="hdr__dot" aria-hidden="true" />
                <span className="sr-only">, сеанс идёт</span>
              </span>
            )}
          </button>
          <button
            ref={settingsBtn}
            type="button"
            className="hdr__link"
            aria-expanded={settings}
            aria-haspopup="dialog"
            onClick={() => setSettings((v) => !v)}
          >
            <SlidersHorizontal aria-hidden="true" />
            <span className="hdr__label">Настройки</span>
          </button>
        </nav>
      </div>
      <Popover open={settings} onClose={() => setSettings(false)} anchorRef={settingsBtn} label="Настройки показа" width={392}>
        <SettingsPanel />
      </Popover>
    </header>
  );
}
