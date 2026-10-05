import { useRef, useState } from 'react';
import { Library, SlidersHorizontal, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { navigate, useRoute } from '../lib/router';
import { Popover } from './Overlay';
import { SettingsPanel } from './SettingsPanel';
import './Header.css';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 5.5a10.5 10.5 0 0 0 0 21z" fill="currentColor" />
      <path d="M16 11.5v9" stroke="var(--bg)" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

export function Header() {
  const route = useRoute();
  const shelves = useStore((s) => s.shelves);
  const jam = useStore((s) => s.jam);
  const open = useUI((s) => s.open);
  const saved = shelves.reduce((n, s) => n + s.items.length, 0);
  const settingsBtn = useRef<HTMLButtonElement>(null);
  const [settings, setSettings] = useState(false);

  return (
    <header className="hdr">
      <div className="hdr__inner container">
        <a
          className="hdr__brand"
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
          aria-label="Полутьма — на главную, к афише вечера"
          aria-current={route.name === 'catalog' ? 'page' : undefined}
        >
          <Logo className="hdr__logo" />
          <span className="hdr__word">Полутьма</span>
        </a>

        <nav className="hdr__nav" aria-label="Основное">
          <button type="button" className="hdr__link" onClick={() => open({ type: 'shelves' })}>
            <Library aria-hidden="true" />
            <span className="hdr__label">Мои полки</span>
            {saved > 0 && (
              <span className="hdr__count" aria-label={`сохранено: ${saved}`}>
                {saved}
              </span>
            )}
          </button>
          <button type="button" className={`hdr__link ${jam ? 'is-live' : ''}`} onClick={() => open({ type: 'jam' })}>
            <Users aria-hidden="true" />
            <span className="hdr__label">Смотреть вместе</span>
            {jam && <span className="hdr__live" aria-label="сеанс идёт" />}
          </button>
          <button
            ref={settingsBtn}
            type="button"
            className="hdr__link hdr__link--icon"
            aria-expanded={settings}
            aria-haspopup="dialog"
            onClick={() => setSettings((v) => !v)}
          >
            <SlidersHorizontal aria-hidden="true" />
            <span className="hdr__label">Настройки</span>
          </button>
        </nav>
      </div>
      <Popover open={settings} onClose={() => setSettings(false)} anchorRef={settingsBtn} label="Настройки показа" width={380}>
        <SettingsPanel />
      </Popover>
    </header>
  );
}
