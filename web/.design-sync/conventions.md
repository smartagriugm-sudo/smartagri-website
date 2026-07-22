# smartagri UI kit — conventions

The reusable, presentational surface of the smartagri (Smart Agriculture
Research Center) landing site. Every component is self-contained and
prop-driven; the brand is carried by Tailwind classes baked into each
component and by the shipped `styles.css`.

## Setup — no provider needed

Import components directly and render them. There is **no** context provider,
theme wrapper, or router to set up; a bare `<CallToAction />` renders correctly
on its own. `styles.css` (which `@import`s the Inter `@font-face` and the
component CSS) is the only styling dependency, and it is already wired.

```jsx
import { PageHero, Impact, Button, CallToAction } from "smartagri-ui";

function ResearchPage() {
  return (
    <main style={{ fontFamily: "'Inter', sans-serif", background: "#fff" }}>
      <PageHero
        eyebrow="Research"
        title={<>Data-driven <span style={{ color: "#14919B", fontWeight: 600 }}>agriculture</span></>}
        subtitle="From UAV monitoring to plant-factory control."
      />
      <Impact />
      <CallToAction />
    </main>
  );
}
```

## The styling idiom

This kit has **no semantic token classes** (no `bg-surface`, no `text-body`).
The brand is expressed with **literal hex values** — inside the components as
Tailwind arbitrary utilities (`bg-[#45DFB1]`), and, for any layout glue you
add yourself, as **inline styles** using the same values (arbitrary Tailwind
classes you invent will not be compiled into the shipped CSS, so prefer inline
styles for your own markup).

Palette (use these exact values):

| Role | Hex |
|---|---|
| teal900 (deep, headings/numbers on light) | `#0B6477` |
| teal600 (accent word on light) | `#14919B` |
| cyan500 | `#0AD1C8` |
| mint400 (primary CTA fill, badges) | `#45DFB1` |
| green300 (CTA hover, accent on dark) | `#80ED99` |
| dark card / panel background | `#08313A` |
| CTA text on mint | `#0B2A22` |

Type — **Inter carries everything** (shipped via `styles.css`); roles differ by
weight/size/tracking, not by family:

- Headings: weight 600, aggressive negative tracking (`letter-spacing: -0.03em`
  on large H2, `-0.035em` on page H1).
- Body & buttons: weight 400/500, 14–18px, line-height 1.5.
- Eyebrow: 13px, weight 500, `letter-spacing: 0.03em`, **no uppercase**, color
  `#14919B`.
- Accent word inside a heading: **not italic** — color `#14919B` (or `#80ED99`
  on dark backgrounds), weight 600.
- The wordmark is always lowercase: `smartagri`.

Primary CTA recipe: fill `#45DFB1`, text `#0B2A22`, hover `#80ED99`, rounded
`rounded-2xl`, tall (`h-12`/`h-14`) — or just use `<Button>`.

## Components

- **Button** — the core action control. `variant`: `primary` (mint pill, one per
  view), `outline` (white border, for dark panels), `outlineDark` (teal border,
  for light). Pass `href` to render an anchor.
- **Eyebrow** — the small teal section label above headings.
- **PageHero** — page intro: `eyebrow` + `title` (accepts an accent `<span>`) +
  `subtitle`.
- **CallToAction** — the closing dark CTA banner (self-contained, no props).
- **Impact** — a band of large teal stat numbers; pass `stats` or use defaults.
- **PartnerMarquee** — continuous grayscale logo/name marquee; pass `partners`.
- **TeamCard** — member card with photo (or gradient + initials fallback) and an
  optional Coordinator badge; pass `member` and `index`.
- **WorkflowEmbed** — frames a workflow HTML in the dark smartagri panel.

## Where the truth lives

Read `styles.css` and its imports (`fonts/fonts.css`, `_ds_bundle.css`) for the
exact type and component styling, and each component's `<Name>.d.ts` (the prop
contract) and `<Name>.prompt.md` (usage) before composing.
