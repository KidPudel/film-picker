import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { useRoute, navigate } from './lib/router';
import { useStore } from './store/useStore';
import { FILM_BY_SLUG } from './data/films';
import { Header } from './components/Header';
import { Toasts } from './components/Toasts';
import { Catalog } from './pages/Catalog';
import { FilmPage } from './pages/FilmPage';
import { Overlays } from './components/Overlays';
import { TicketTray } from './components/TicketTray';

/** Mirrors viewer preferences onto <html> so CSS tokens can react. */
function usePrefsOnRoot() {
  const prefs = useStore((s) => s.prefs);
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = prefs.theme;
    el.dataset.text = prefs.text;
    el.dataset.contrast = prefs.contrast;
    if (prefs.motion === 'reduce') el.dataset.motion = 'reduce';
    else delete el.dataset.motion;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', prefs.theme === 'light' ? '#f4eee4' : '#0b0908');
  }, [prefs]);
  return prefs;
}

export function App() {
  const route = useRoute();
  const prefs = usePrefsOnRoot();
  const film = route.name === 'film' ? FILM_BY_SLUG.get(route.slug) : undefined;

  useEffect(() => {
    document.title = film ? `${film.title} (${film.year}) — Полутьма` : 'Полутьма — кино на этот вечер';
  }, [film]);

  return (
    <MotionConfig reducedMotion={prefs.motion === 'reduce' ? 'always' : 'user'}>
      <a className="skip-link" href="#main" onClick={(e) => {
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}>
        К содержанию
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        {route.name === 'catalog' && <Catalog />}
        {route.name === 'film' && (film ? <FilmPage key={film.id} film={film} /> : <NotFound />)}
        {route.name === 'notfound' && <NotFound />}
      </main>
      <TicketTray />
      <Toasts />
      <Overlays />
      <div className="atmosphere" aria-hidden="true" />
    </MotionConfig>
  );
}

function NotFound() {
  return (
    <div className="container" style={{ paddingBlock: '6rem', display: 'grid', gap: '1rem', justifyItems: 'start' }}>
      <p className="eyebrow">Ошибка 404 · плёнка оборвалась</p>
      <h1 className="display" style={{ fontSize: 'var(--fs-3xl)' }}>
        Такого сеанса нет
      </h1>
      <p style={{ color: 'var(--text-2)' }}>Возможно, ссылка устарела. Вернитесь в афишу — там всё на месте.</p>
      <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
        В афишу вечера
      </button>
    </div>
  );
}
