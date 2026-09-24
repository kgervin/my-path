# 5. ASU palette with Liquid Glass for the functional layer

- Status: accepted
- Date: 2026-09-24

## Context
The UI needed a stronger identity that fits ASU and feels current, without losing the WCAG 2.2 AA
guarantees the product is built around.

## Decision
- **Colors:** the official ASU palette ([brand guide](https://brandguide.asu.edu/brand-elements/design/color)).
  Maroon `#8C1D40` leads in light mode; Gold `#FFC627` leads in dark mode, where it has 10:1+
  contrast. Gold is never text on white and white is never on gold (ASU rule, and it fails
  contrast). Status colors are darkened (light) or lightened (dark) variants that pass AA.
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
Axe (WCAG 2.2 AA) now runs in CI on a light phone, a **dark** phone and a desktop viewport.
New colors must be added as tokens and contrast-checked in both themes.

## Update (2026-09-24): visual refresh from the Figma Make prototype
- **Type:** Plus Jakarta Sans (variable, self-hosted via `@fontsource`, so the CSP stays
  `default-src 'self'`) for display; system SF for body text.
- **Layout:** joined panels with hairline dividers (stat strip, student list, "How it works"),
  a larger and tighter hero headline, initials avatars, and a large "days left" figure in three
  urgency tiers (critical, warning, normal). Each tier's color passes AA in both themes, and
  screen readers get the full sentence ("Urgent: 3 days to drop").
- **Kept official ASU Maroon `#8C1D40`**; the prototype's `#c41e4a` is not an ASU color.
- **No eyebrow labels** (small uppercase kickers above headings) anywhere, by product decision.
