# Handoff — visual rebuild (start here in a new session)

**Status (2026-10-05):** product/UX layer is done and works (see `docs/product.md`). The visual skin was rejected by the user as "AI slop" and is mid-rebuild. Do the rebuild **with the skills loaded**: `frontend-design` (plugin `frontend-design@claude-plugins-official`), `impeccable` (plugin `impeccable@impeccable`, run its `scripts/impeccable context` setup first), and `emil-design-eng`. Both plugins are installed and enabled at user scope. Anthropic's **Design** plugin is also enabled on the account — use its skills at the matching steps: `design-critique` on the rebuilt pages, `accessibility-review` as the a11y audit, `ux-copy` to review the Russian copy, `design-system` to document tokens/components, `design-handoff` for the final spec.

## What the user asked for (verbatim intent)
- Not the skin they got: no serif, no warm brown/brass, no flat CSS cones. **Clean, big, sans.**
- **Immersive, realistic projector rays** that "warp us" — references: a booth window with a bright point source, volumetric cyan/teal/white streaks fanning through haze, red velvet seats in the foreground catching the light.
- Free to rebuild visuals **and interaction** completely. Keep the experience features.

## Technical pieces already built (reuse only if the new direction wants them)
- `src/components/Projector.tsx` + `src/store/useProjector.ts` — **WebGL volumetric beam** (fixed canvas behind the app): lens glare + booth window, colour bands from a 16-colour palette, fbm smoke, dust motes, `warp()` outward streaks, scroll dimming, reduced-motion freeze, light-theme hide, no-WebGL fallback. **Not yet mounted** in `App.tsx` and not yet tuned visually.
- Per-film beam palettes: `npm run posters` writes `palette` (poster columns lifted to light) into `src/data/posters.generated.json`. Not yet exposed on `Film` (add `poster.palette`).
- `src/components/Seats.tsx` — red velvet seat rows lit from `lightX`. Not yet used.
- `src/styles/tokens.css`, `src/styles/base.css` and every component `.css` are **not authoritative** — they were reworked without the design skills. Replace freely (fonts, palette, layout, components, interaction).
- `src/components/ReasonIcon.tsx` — drawn icons for reason lines (status never by colour alone).

## Constraints that must survive
Russian UI, gender-neutral copy, every action reversible with toast undo, AA contrast (axe = 0 violations in both themes), keyboard + screen reader support, reduced motion, GitHub Pages (hash routing, `base: './'`). Mock data stays labelled «демо».
