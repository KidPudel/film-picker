import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { useRoute, navigate } from './lib/router';
import { useStore } from './store/useStore';
import { useProjector } from './store/useProjector';
import { FILM_BY_SLUG } from './data/films';
import { Projector } from './components/Projector';
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', prefs.theme === 'light' ? '#eef1f6' : '#0b1120');
  }, [prefs]);
  return prefs;
}

export function App() {
  const route = useRoute();
  const prefs = usePrefsOnRoot();
  const film = route.name === 'film' ? FILM_BY_SLUG.get(route.slug) : undefined;

  useEffect(() => {
    document.title = film ? `${film.title} (${film.year}) — Кино на вечер` : 'Кино на вечер — фильм, который подходит сегодня';
  }, [film]);

  // The catalog has no screen: the light pours into the dark ahead (its frame is set by the catalog).
  useEffect(() => {
    const p = useProjector.getState();
    p.setMode(film ? 'film' : 'catalog');
    if (!film) p.setPreview(null);
  }, [film]);

  return (
    <MotionConfig reducedMotion={prefs.motion === 'reduce' ? 'always' : 'user'}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        К содержанию
      </a>
      <Projector />
      <Header />
      <main id="main" tabIndex={-1}>
        {route.name === 'catalog' && <Catalog />}
        {route.name === 'film' && (film ? <FilmPage key={film.id} film={film} /> : <NotFound />)}
        {route.name === 'notfound' && <NotFound />}
      </main>
      <TicketTray />
      <Toasts />
      <Overlays />
    </MotionConfig>
  );
}

function NotFound() {
  return (
    <div className="container notfound">
      <h1 className="display notfound__title">Такого сеанса нет</h1>
      <p className="notfound__text">Ссылка могла устареть. Вся афиша на месте — вернитесь и выберите фильм на вечер.</p>
      <button type="button" className="btn btn--primary btn--lg" onClick={() => navigate('/')}>
        К афише
      </button>
    </div>
  );
}
