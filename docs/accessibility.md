# Accessibility

**Target:** WCAG 2.2 level AA on phones, tablets and desktops, in light and dark mode.

## What we do

| Area | Practice |
| --- | --- |
| Structure | Landmarks (`header`, `nav`, `main`, `footer`, `search`), one `h1` per page, logical heading order, and a skip link to main content. |
| Navigation | Focus moves to the page heading on route change; the document title updates; after a decision, focus moves to the next control instead of being lost. |
| Keyboard | Everything works with a keyboard. Native `<dialog>` traps focus and closes with Escape. Visible 3 px focus ring. The scrollable table region is focusable. |
| Forms | Every input has a `<label>`; hints and errors are linked with `aria-describedby`; groups use `<fieldset>` and `<legend>`; toggles use `aria-pressed`. |
| Status | Progress, results counts and toasts use `role="status"` (polite live regions); blocking errors use `role="alert"`. |
| Colour | Text meets 4.5:1 (large text and UI parts 3:1) in both themes. Colour is never the only cue: urgency, status and file checks pair text with an icon, plus hidden "Urgent:" text for screen readers. |
| Touch | Targets are at least 44 × 44 CSS px (WCAG 2.5.8 needs 24). |
| Motion | `prefers-reduced-motion` disables animation. |
| Transparency | Liquid Glass surfaces (nav, action bar, toasts, dialogs) turn solid under `prefers-reduced-transparency`, `prefers-contrast: more`, or without `backdrop-filter` support; `forced-colors` adds borders. |
| Reflow | Mobile-first layout works down to 320 px with no horizontal scrolling (tested in CI). |
| Language | `lang="en"` on the page; plain language at grade 8 or lower in UI copy and drafts. |

## How it is tested

1. **Lint:** oxlint `jsx-a11y` rules fail the build.
2. **Unit:** `vitest-axe` checks every page in jsdom.
3. **End to end:** Playwright runs axe with the WCAG 2.0/2.1/2.2 A and AA rule sets on a Pixel 7
   (light and dark) and a 1280 px desktop, and checks for horizontal overflow.
4. **Manual (each release):** keyboard-only pass, VoiceOver (iOS/macOS) and NVDA (Windows) pass
   of the upload → review → approve flow, and 200% zoom.

Automated tools find about a third of issues, so the manual pass is required before a pilot.

## Reporting a problem

Open an issue with the "Bug report" template and include your device, browser and assistive
technology.
