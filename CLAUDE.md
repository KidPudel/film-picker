# Полутьма — film-for-tonight prototype

A test-assignment prototype: a web service that helps someone pick a film **for tonight**. Two required pages — catalog (`#/`) and film page (`#/film/:slug`) — plus overlays. UI language: **Russian**. Hosted on GitHub Pages (static, hash routing).

Read first: **`docs/handoff.md` (current status — the visual layer is mid-rebuild)** and `docs/product.md` (who, why, what each feature solves). `research.md` is the source research. Visual work must use the `frontend-design`, `impeccable` and `emil-design-eng` skills; there is no authoritative visual spec until the rebuild writes `DESIGN.md`.

## Commands

```bash
npm run dev         # http://localhost:5173
npm run typecheck   # tsc --noEmit (must be clean)
npm run build       # → dist/ (static, deployable anywhere)
npm run posters     # regenerate public/posters/*.webp + src/data/posters.generated.json from movies-data/posters
```

Deploy: push to `main` → `.github/workflows/deploy.yml` builds and publishes to Pages. `vite.config.ts` uses `base: './'`, so the build works under any repo sub-path.

## Map

| Where | What |
| --- | --- |
| `movies-data/movies.json` | Raw dataset (source of truth for facts). Never edit by hand. |
| `src/data/editorial.ts` | **Our** layer per film: experience words, scales, fit line, when-to-watch, content notes, availability (mock), audio (mock), non-spoiler answers. |
| `src/data/films.ts` | Merges raw + editorial → typed `Film` (see `src/data/types.ts`). |
| `src/data/vocab.ts` | Experience vocabulary, tuner options, scale wording, spoiler levels. |
| `src/data/social.ts` | Demo friends & their ratings (labelled «демо» in UI). |
| `src/lib/match.ts` | Matching engine: every film gets human-readable reasons (ok / warn / no). Nothing is hidden silently. |
| `src/lib/parse.ts` | Free-text → tonight settings («что-то тёплое, но не комедию»). Rule-based, negations first. |
| `src/lib/assistant.ts` | «Подсказчик» Q&A with spoiler gating; similar/alternative films. |
| `src/lib/router.ts` | Hash router + View Transitions (poster flies to the screen) + scroll restore + `goBack()`. |
| `src/store/useStore.ts` | Persisted state (zustand → localStorage `polutma:v1`): tonight, tickets, shelves, dismissals, dislikes, prefs, jam. |
| `src/store/useUI.ts` | Ephemeral: open overlay, toasts. |
| `src/pages/` | `Catalog.tsx`, `FilmPage.tsx` |
| `src/components/` | One component + co-located `.css` each. `Overlay.tsx` = Popover / Dialog / phone sheet primitives. |
| `src/styles/tokens.css` | Design tokens (being replaced in the visual rebuild). |

## Conventions (keep them)

- **Copy**: Russian, plain, warm, concrete. Gender-neutral («в одиночку», «уже смотрено», not «смотрел(а)»). Describe the experience, never promise feelings. No plot twists anywhere except `contentNotes` (behind a reveal).
- **Every action is reversible**: destructive or dismissive actions show a toast with «Отменить/Вернуть».
- **Colour only from tokens** (`var(--…)`); status never by colour alone (icon + text).
- **Motion**: decorative/looping motion must stop under reduced motion (`prefers-reduced-motion` **or** `html[data-motion=reduce]`). Everything else about motion comes from the design skills.
- **A11y**: semantic HTML, 44px targets, visible focus (`--focus`), radiogroups for segmented controls, dialogs trap focus + make `#root` inert, live regions for result counts/toasts. Original titles carry `lang`.
- **Demo vs real**: availability, audio tracks, friends, jam partner and the assistant are mock/demo and say so in the UI. Ratings, awards, credits, synopsis, sources come from the dataset — never invent them.

## Adding a film

1. Add it to `movies-data/movies.json` + poster to `movies-data/posters/<kinopoisk_id>.jpg`, run `npm run posters`.
2. Add an `EDITORIAL[<id>]` entry (TypeScript will fail until you do) and put the id into `ORDER` in `films.ts`.

## Verifying a change

- `npm run typecheck && npm run build`
- In the browser: catalog → tune the sentence → card → film page → back (scroll restored) → tickets → compare/roulette/jam.
- Accessibility audit (dev server running), paste into the console:
  `const s=await fetch('/node_modules/axe-core/axe.min.js').then(r=>r.text());(0,eval)(s);(await axe.run()).violations`
  Expect `[]` in both themes.
