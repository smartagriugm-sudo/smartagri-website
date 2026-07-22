# design-sync notes — smartagri UI kit

## What this sync actually is
- This repo (`web/`) is a **TanStack Start landing-page app, not a design system**.
  It has no Storybook and no component-library build.
- The design system synced to claude.ai/design is a **hand-built extraction** under
  `.design-sync/ui-kit/` — its own package `smartagri-ui` (`src/` + `tsconfig.json`
  + `package.json`), built to `dist/` (JS + `.d.ts`) with the repo's `tsc`, plus a
  Tailwind stylesheet `ds.css`. `cfg.buildCmd` runs both (tsc + the tailwind CLI).
- Converter is pointed at it with `--entry .design-sync/ui-kit/dist/index.js`
  `--node-modules ./node_modules`. PKG_DIR resolves to `ui-kit` (its package.json
  name matches `cfg.pkg` = `smartagri-ui`).

## Component provenance (8 components)
- **Byte-faithful copies** of real app components, only the `../lib/fonts` import
  path changed to `./fonts`: `PageHero`, `CallToAction`, `Impact`, `WorkflowEmbed`.
- **Decoupled variants** (same brand markup, coupling removed): `TeamCard` (dropped
  the TanStack `<Link>`, added `href`; inlined `memberGradients`/`memberInitials`),
  `PartnerMarquee` (takes `partners` prop instead of importing `PARTNERS`).
- **Extracted brand primitives** (were inline JSX in the app): `Button`, `Eyebrow`.
- `MemberPhoto` is excluded via `componentSrcMap` (it is a TeamCard internal).

## Gotchas that cost debugging time
- **`MotionGlobalConfig.skipAnimations = true` in `ui-kit/src/index.ts` is load-bearing.**
  The components use framer-motion `whileInView` / `animate` starting at `opacity:0`.
  `package-capture` screenshots with no settle delay, so without skipAnimations every
  motion component captures BLANK. It also guarantees the components are visible in
  Claude Design's canvas (not gated on scroll-into-view). Do not remove it.
  Note: setting skipAnimations in a preview `.tsx` does NOT work — the preview's
  framer-motion is a different module instance from the bundle's; it must be in the
  kit entry.
- **Inter** ships as a single variable woff2 (latin subset) at `ui-kit/fonts/Inter-latin.woff2`
  (downloaded from Google Fonts v20). `fonts.css` `@font-face` references it. If it
  goes missing, re-download the latin subset from the Google Fonts CSS2 API.
- **Partner logos and team photos do not load in previews** — they resolve to the app's
  runtime `/brand/...` paths. Previews use names-only (PartnerMarquee) and the gradient +
  initials fallback (TeamCard) on purpose.
- **`finalize_plan` needs an ABSOLUTE `localDir`** — a relative `./ds-bundle` was doubled
  to `ds-bundle/ds-bundle` and failed ENOENT.

## Known render warns
- `[RENDER_THIN]` on `PageHero` only appears BEFORE its preview is authored (floor card
  mounts just "PageHero"). With `previews/PageHero.tsx` present it is clean. Not a warn
  to chase once previews exist.

## Re-sync risks (watch-list)
- The 4 byte-faithful copies are **manual copies** of `web/src/components/*`. If the real
  components change (brand tweak, new markup), the ui-kit copies will NOT auto-update —
  re-copy them and rebuild. Same for the `memberGradients`/`memberInitials` inlined into
  the TeamCard variant (source of truth is `web/src/lib/team.ts`).
- `ds.css` is Tailwind compiled from `ui-kit/src` only (via `@source`). A class used in a
  component but not re-scanned would ship unstyled — `cfg.buildCmd` rebuilds it, so always
  run buildCmd before the converter.
- `skipAnimations` depends on the `framer-motion` export name `MotionGlobalConfig`; a major
  framer-motion bump could rename it.
- The kit deliberately renders components at final (non-animated) state; the app's own
  components keep their entrance animations. This is a design decision, not drift.
