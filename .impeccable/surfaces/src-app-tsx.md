---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pages/Catalog.tsx","src/pages/FilmPage.tsx"]
---

# Surface: Кино на вечер (catalog `#/` + film page `#/film/:slug` + overlays)

Mode: Operate (the visitor chooses a film for tonight). Russian UI, gender-neutral, WCAG AA, GitHub Pages.

Audience and job: tired solo viewer at ~21:30 (primary), pairs, cautious viewers, cinephiles, families. Job: find a film that fits this evening and understand why, without spending the evening choosing. Proof: real dataset facts, editorial fit reasons; availability, friends, partner, assistant are demo and labelled.

Pinned by the user (in order received): dark cinema hall, viewer seated; projector behind the viewer's head, beam pours past from above and the sides through haze and "warps, wraps, hugs"; catalog has no screen, the light retints on hover; film page shows the film with real stills, verdict and action in the first viewport; velvet seats; big clean ROUNDED sans (Onest, chosen from a specimen); poster cards, not a list; no generic AI palette — a minimal, strong neutral base where the film gives the colour; content first, blended into the UI (Kinopoisk's philosophy); light theme kept as "свет в зале включён" (projector off).

## Direction contract

THESIS: Choosing tonight's film from your seat in a dark hall: the films are the only colour, their sessions are drawn to scale on tonight's clock, and every film says why it fits. Refuses the generic dark-UI kit (neon accent, glow, pills everywhere) and the plain streaming carousel.

OWN-WORLD: Neutral black hall on a hue-less ramp, white type in Onest, three greys, hairlines, near-square corners; one white rectangle (or the film's colour on its own page) is the primary action. Colour only from films: posters, each film's editorial accent on its session bar and page action, the projector carrying its frames into haze; velvet seats rendered in the light. No UI accent colour, no glows on controls.

STORY: The visitor says what tonight is (sentence or own words), scans a poster wall where facts line up across cards and each session bar ends at a clock time, hovers to feel each film's light in the hall, holds up to three tickets, opens one: the light warps forward and the film fills the screen ahead, dissolving into the hall, with verdict and action beside it.

FIRST VIEWPORT: Catalog: slim header (plain title, Мои полки, Смотреть вместе, Настройки); light from behind the viewer converging ahead; centred display sentence with blanks, one-line free text, preset pills; velvet seat row along the bottom. Film page: the film's still full-bleed, fading into the hall on the left and bottom; poster, title, meta, fit line, verdict, film-coloured action and actions on the dark side; frame controls with pause; seats below; prev/next film one key or swipe away.

FORM: Tonight's Showtimes fused into the pinned hall, re-expressed as a poster wall at the user's request; position 3 of my grounded list; seed key c0e450f9. Raises kept: duration drawn to scale on tonight's clock; strict shared grid (subgrid rows align facts across cards); the light follows the pointed/centred film; next match one swipe away; imagery never tinted. Signature interaction: hover/focus/centre retints the hall to that film; opening a film warps the streaks forward and the poster flies onto the page. Motion: press 0.97 / 140 ms; popovers 180 ms origin-aware; sheets spring with velocity dismiss; transforms only; subtitles-style toasts fade in; reduced motion: no warp, frozen haze, no Ken Burns, no auto-advance.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Three films have only 1–3 stills (TMDB); their backdrops rotate fewer frames.
