# Кино на вечер — film-for-tonight prototype

A test-assignment prototype: a web service that helps someone pick a film **for tonight**. Two required pages — catalog (`#/`) and film page (`#/film/:slug`) — plus overlays. UI language: **Russian**. Hosted on GitHub Pages (static, hash routing).

Read first: **`DESIGN.md`** (the visual system: neutral base, colour only from films, projector hall), `docs/handoff.md` (status) and `docs/product.md` (who, why, what each feature solves). `research.md` is the source research. Visual work must use the `frontend-design`, `impeccable` and `emil-design-eng` skills (impeccable's direction contract: `.impeccable/surfaces/src-app-tsx.md`). No invented brand name — the plain title is «Кино на вечер».

## Commands

```bash
npm run dev         # http://localhost:5173
npm run typecheck   # tsc --noEmit (must be clean)
npm run build       # → dist/ (static, deployable anywhere)
npm run media       # regenerate public/{posters,stills,beam}/*.webp + src/data/media.generated.json from movies-data/{posters,stills}
                    # then re-embed provenance: impeccable embed-prompt (see DESIGN.md › Imagery)
```

Deploy: push to `main` → `.github/workflows/deploy.yml` builds and publishes to Pages. `vite.config.ts` uses `base: './'`, so the build works under any repo sub-path.

## Map

| Where | What |
| --- | --- |
| `movies-data/movies.json` | Raw dataset (source of truth for facts). Never edit by hand. |
| `src/data/editorial.ts` | **Our** layer per film: experience words, scales, fit line, when-to-watch, content notes, availability (mock), audio (mock), non-spoiler answers. |
| `src/data/films.ts` | Merges raw + editorial + media → typed `Film` (see `src/data/types.ts`): poster, stills, beam frames, aspect ratio. |
| `movies-data/stills.json` | Spoiler-safe TMDB stills: file, original URL, page (provenance). |
| `src/data/vocab.ts` | Experience vocabulary, tuner options, scale wording, spoiler levels. |
| `src/data/social.ts` | Demo friends & their ratings (labelled «демо» in UI). |
| `src/lib/match.ts` | Matching engine: every film gets human-readable reasons (ok / warn / no). Nothing is hidden silently. |
| `src/lib/parse.ts` | Free-text → tonight settings («что-то тёплое, но не комедию»). Rule-based, negations first. |
| `src/lib/assistant.ts` | «Подсказчик» Q&A with spoiler gating; similar/alternative films. |
| `src/lib/router.ts` | Hash router + View Transitions (poster flies onto the film page) + scroll restore + `goBack()`; `instant` for keyboard moves. In-page `#id` links must `preventDefault` (hash routing). |
| `src/store/useStore.ts` | Persisted state (zustand → localStorage `kino-na-vecher:v1`): tonight, tickets, shelves, dismissals, dislikes, prefs, jam. |
| `src/store/useUI.ts` | Ephemeral: open overlay, toasts. |
| `src/pages/` | `Catalog.tsx` (sentence + poster wall), `FilmPage.tsx` (film backdrop hero + sections) |
| `src/components/Projector.tsx` | WebGL hall: the film's frame ray-marched through haze from behind the viewer, velvet seats, dust, warp; `src/store/useProjector.ts` describes the scene. |
| `src/components/Schedule.tsx` | Poster wall: cards share subgrid rows; session bar to scale in the film's accent. |
| `src/components/Screen.tsx` | `FilmBackdrop`: stills dissolving into the hall, pause control, projector target. |
| `src/components/` | One component + co-located `.css` each. `Overlay.tsx` = Popover / Dialog / phone sheet primitives. |
| `src/styles/tokens.css` | Design tokens: neutral ramp, type (Onest), space, motion. Films colour only their own marks via `--accent`. |

## Conventions (keep them)

- **Copy**: Russian, plain, warm, concrete. Gender-neutral («в одиночку», «уже смотрено», not «смотрел(а)»). Describe the experience, never promise feelings. No plot twists anywhere except `contentNotes` (behind a reveal).
- **Every action is reversible**: destructive or dismissive actions show a toast with «Отменить/Вернуть».
- **No UI accent colour.** Neutral tokens only; a film's colour (`ed.accent` → `--accent`) appears only on that film's marks. Status never by colour (icon shape + text).
- **Motion**: decorative/looping motion must stop under reduced motion (`prefers-reduced-motion` **or** `html[data-motion=reduce]`). Everything else about motion comes from the design skills.
- **A11y**: semantic HTML, 44px targets, visible focus (`--focus`), radiogroups for segmented controls, dialogs trap focus + make `#root` inert, live regions for result counts/toasts. Original titles carry `lang`.
- **Demo vs real**: availability, audio tracks, friends, jam partner and the assistant are mock/demo and say so in the UI. Ratings, awards, credits, synopsis, sources come from the dataset — never invent them.

## Adding a film

1. Add it to `movies-data/movies.json` + poster to `movies-data/posters/<kinopoisk_id>.jpg` (+ spoiler-safe stills in `movies-data/stills/` listed in `stills.json`), run `npm run media`.
2. Add an `EDITORIAL[<id>]` entry (TypeScript will fail until you do) and put the id into `ORDER` in `films.ts`.

## Verifying a change

- `npm run typecheck && npm run build`
- In the browser: catalog → tune the sentence → card → film page → back (scroll restored) → tickets → compare/roulette/jam.
- Accessibility audit (dev server running), paste into the console:
  `const s=await fetch('/node_modules/axe-core/axe.min.js').then(r=>r.text());(0,eval)(s);(await axe.run()).violations`
  Expect `[]` in both themes.
