# 4. React + TypeScript SPA with plain CSS layers

- Status: accepted
- Date: 2026-09-22

## Context
Coaches use phones and laptops. The UI must meet WCAG 2.2 AA and stay small and fast.

## Decision
- React 19 + TypeScript (strict), Vite, React Router, TanStack Query for server state.
- No component library: native elements (`<dialog>`, `<details>`, `<progress>`, `<table>`)
  give accessibility for free. Styling is one mobile-first stylesheet with cascade layers and
  design tokens (light theme only; see ADR 0005).
- Accessibility is enforced by oxlint jsx-a11y rules, axe in unit tests, and axe + Playwright
  in CI on phone and desktop viewports.

## Consequences
A small bundle (about 120 KB gzipped), few dependencies, and accessible behaviour by default.
Custom widgets need extra care, so we avoid them.
