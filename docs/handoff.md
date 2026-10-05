# Handoff — state of the prototype

**Status (2026-10-05):** product/UX layer done (see `docs/product.md`); visual layer rebuilt with the design skills (impeccable, frontend-design, emil-design-eng, Anthropic Design plugin). The visual system is documented in `DESIGN.md`; impeccable's direction contract is in `.impeccable/surfaces/src-app-tsx.md`.

## What the user asked for (and confirmed along the way)
- A dark cinema hall you sit in: the projector is behind your head, its beam pours past you through haze and "warps, wraps, hugs". Velvet seats in front of you.
- Catalog: no screen; the hall's light takes the colours of the film you point at (on touch screens — the one in the middle of the screen). With an evening set, the best match colours the hall.
- Poster cards, not a list. Clean, big, **rounded** sans → Onest (picked from a specimen).
- No generic AI palette: a minimal, strong neutral base; **the film gives the colour** (posters, the film's `ed.accent` on its session bar and page action, frames in the light).
- Content first, blended into the UI (the Kinopoisk philosophy): the film page opens on the film's still, dissolving into the hall.
- More images than posters: spoiler-safe stills from TMDB (provenance in `movies-data/stills.json` and embedded in every raster).
- No invented brand: plain title «Кино на вечер»; storage key `kino-na-vecher:v1`.

## Verification
- `npm run typecheck && npm run build`
- axe: 0 violations in both themes across catalog, tray + toasts, compare, settings, jam, shelves, film page, «Не то», paywall, watch.
- Keyboard: popovers and dialogs trap/return focus; ←/→ step films on the film page.
- Reflow: no horizontal scroll at 320 px or 200% zoom.
- Headless captures for review: `.impeccable/review/` (git-ignored).

## Known limits
- Three films have only 1–3 stills on TMDB (Не хороните меня без Ивана, Война искусств, Книготорговцы); their backdrops rotate fewer frames.
- `npm run media` regenerates WebP files without embedded provenance; re-run `impeccable embed-prompt` (see DESIGN.md › Imagery) after regenerating.
- Availability, prices, audio tracks, friends, the jam partner and the assistant are demo and say so in the UI.
