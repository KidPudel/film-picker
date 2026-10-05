---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pages/Catalog.tsx","src/pages/FilmPage.tsx"]
---

# Surface: Кино на вечер (catalog `#/` + film page `#/film/:slug` + overlays)

Mode: Operate (the visitor chooses a film for tonight). Russian UI, gender-neutral, WCAG AA, GitHub Pages.

Audience and job: tired solo viewer at ~21:30 (primary), pairs, cautious viewers, cinephiles, families. Job: find a film that fits this evening and understand why, without spending the evening choosing. Proof: real dataset facts, editorial fit reasons; availability, friends, partner, assistant are demo and labelled.

Pinned by the user: dark cinema hall, viewer seated; projector behind the viewer's head, beam pours past from above and the sides through haze toward the screen ahead and "warps, wraps, hugs" the viewer; catalog has no screen, the light retints on hover; film page shows the film on the screen with real stills at its true aspect, verdict and action in the first viewport; velvet seats; clean big sans, no serif; light theme kept as "свет в зале включён" (projector off).

## Direction contract

THESIS: Choosing tonight's film is reading a showtime schedule from your seat in a dark hall: every film is a session that starts now, ends at a time drawn to scale, and says why it fits. Refuses the streaming default of a backdrop carousel over poster rails.

OWN-WORLD: Deep indigo hall on an 11-step luminance ramp where brightness means relevance; volumetric projector light from behind the viewer whose colour and streaks come from the film's own image; velvet seat backs and armrests framing the lower corners; Sofia Sans Semi Condensed display over Sofia Sans text; hairline schedule rows, never card boxes; screen-white primary action; velvet red marks your tickets.

STORY: The visitor says what tonight is (sentence or own words), scans one schedule where each row ends in a now→finish bar against their time line, hovers to feel each film's light, holds up to three tickets, opens one: the light warps forward and the film lands on the screen with verdict and action.

FIRST VIEWPORT: Catalog: slim header (plain title, Мои полки, Смотреть вместе, Настройки); light enters from the top edge and both sides, converging low-centre; left-aligned sentence at display scale with slot blanks, free-text line and presets; seat backs along the bottom; the schedule head and first row peek above the fold. Film page: screen at the film's aspect in the upper half showing stills, light landing on it; below, title, verdict with top reasons, session bar, primary action; seat backs under the screen; previous/next match one key or swipe away.

FORM: Tonight's Showtimes (cinema showtime board) fused into the pinned hall; position 3 of my grounded list; seed key c0e450f9. Raises kept: duration drawn to scale on tonight's clock; luminance-ramp tonal discipline; strict shared column grid; the beam's focus is the row's focus; next match one swipe away; imagery never tinted. Signature interaction: hover or focus retints the whole envelope to that film (~0.6 s ambient); opening a film warps the streaks toward the vanishing point while the poster flies to the screen and dissolves into the first still. Motion grammar: press 0.97 / 140 ms; popovers 180 ms origin-aware ease-out; sheets spring with velocity dismiss; list re-rank FLIP; stills crossfade every 7 s with pause; reduced motion: no warp, frozen haze, instant swaps.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Three films have only 1–3 stills (TMDB); their screens alternate poster and stills.
