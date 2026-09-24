# 5. ASU palette with Liquid Glass for the functional layer

- Status: accepted
- Date: 2026-09-24

## Context
The UI needed a stronger identity that fits ASU and feels current, without losing the WCAG 2.2 AA
guarantees the product is built around.

## Decision
- **Colors:** the official ASU palette ([brand guide](https://brandguide.asu.edu/brand-elements/design/color)).
  Maroon `#8C1D40` leads. Gold is never text on white and white is never on gold (ASU rule, and it fails
  contrast). Status colors are darkened variants that pass AA.
- **Materials:** Apple's Liquid Glass guidance: glass only for the floating functional layer
  (navigation bar, phone action bar, toasts, dialogs), never for content. It uses the "regular"
  variant (blur + saturation + a near-opaque tint) because these components carry text. Cards,
  lists and forms stay solid.
- **Fallbacks:** glass turns solid under `prefers-reduced-transparency`, `prefers-contrast: more`
  and when `backdrop-filter` is unsupported; `forced-colors` gets real borders.
- **Layout:** inspired by modern SaaS marketing sites: a bold hero, stat cards, pill chips,
  generous whitespace. No third-party assets or branding are used. The brand mark is My Path's
  own, not an ASU logo.

## Consequences
Axe (WCAG 2.2 AA) runs in CI on a phone and a desktop viewport.
New colors must be added as tokens and contrast-checked.

## Update (2026-09-24): visual refresh from the Figma Make prototype
- **Type:** Plus Jakarta Sans (variable, self-hosted via `@fontsource`, so the CSP stays
  `default-src 'self'`) for display; system SF for body text.
- **Layout:** joined panels with hairline dividers (stat strip, student list, "How it works"),
  a larger and tighter hero headline, initials avatars, and a large "days left" figure in three
  urgency tiers (critical, warning, normal). Each tier's color passes AA, and
  screen readers get the full sentence ("Urgent: 3 days to drop").
- **Kept official ASU Maroon `#8C1D40`**; the prototype's `#c41e4a` is not an ASU color.

## Update (2026-09-24): white, Netflix-and-Apple layout
Supersedes the dark theme and the eyebrow rule above.
- **Light only, white background.** The dark theme is removed (`color-scheme: light`); content
  sits on `#ffffff` with `#f6f6f7` secondary surfaces. The one dark surface is a cinematic,
  Netflix-style maroon-to-black hero on the home page; the rest is Apple-clean white.
- **No gold edge lines** on buttons, pills, avatars or badges (the "eyebrow" the product owner
  ruled out). Gold is left only as a token and the text-selection color.
- **Uppercase kicker labels are allowed** ("COACH QUEUE", "HOW IT WORKS"), in maroon.
- **Home page trimmed** to the hero, "How it works" and the upload card. Tags, the latest-run
  callout and the date picker are gone; runs use today's date.
- **Screens follow the prototype:** a five-part counter strip, a queue heading that states the
  work left ("N students need review") with filters behind a Filter button, a student header
  card, and one "Detected barriers" card per finding. Each card shows the suggested fix and
  only that barrier's source fields (the API now returns `findings` and `suggested_fix`).
- Axe now runs on a phone and a desktop viewport (the dark phone project is removed).
