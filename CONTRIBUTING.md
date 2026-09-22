# Contributing

## Workflow

1. Branch from `main` (`feat/…`, `fix/…`, `chore/…`).
2. Keep changes small; one concern per pull request.
3. `make check` must pass locally. CI also runs end-to-end and accessibility tests.
4. Use [Conventional Commits](https://www.conventionalcommits.org/) for messages.
5. A pull request needs one approving review and green CI to merge (squash merge).

## Definition of done

- Tests cover the change (backend coverage gate 90%, frontend 80%).
- No new lint, type or axe violations. UI changes are checked at 375 px and 1280 px, with
  keyboard only, and in light and dark mode.
- User-facing text is plain language (grade 8 or lower) and follows
  [the heuristics guide](docs/ux/nielsen-heuristics.md).
- New settings are documented in `backend/.env.example`; architectural decisions get an ADR in
  `docs/adr/`.
- Operational changes update [the runbook](docs/sre/runbook.md) and, if needed, alerts in
  `ops/prometheus/rules.yml` (with a `promtool` test).

## Adding a barrier rule

1. Add a value to `Barrier` and its routes in `backend/src/my_path/domain/models.py`.
2. Write a pure rule function in `domain/rules.py` and add it to `RULES`.
3. Add its label and description in `domain/catalog.py`, and its template text in
   `services/drafting/templates.py`.
4. Seed it in `synthetic.py`. The recall test fails until detection is 100%.
