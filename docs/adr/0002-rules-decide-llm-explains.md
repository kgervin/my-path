# 2. Rules decide eligibility; the LLM only explains and drafts

- Status: accepted
- Date: 2026-09-22

## Context
The PRD requires transparent detection, 100% recall on seeded barriers, and that the LLM never
decides eligibility or money. LLM output can drift, be refused or time out.

## Decision
- Detection is a set of pure, unit-tested rule functions with thresholds in config.
- The LLM gets only the flagged structured fields and returns schema-constrained JSON
  (`explanation`, `draft_message`, `fields_used`), with low reasoning effort for latency and cost.
- Every draft passes deterministic guardrails (length, reading level, first name, banned
  phrases, cited fields must be a subset of flagged fields). Any failure, refusal, timeout or
  API error falls back to a reviewed template. Fallbacks are counted in a metric with an alert.
- The default drafter is the template; the Claude drafter is opt-in (`MY_PATH_DRAFTER=anthropic`).

## Consequences
The demo and tests are deterministic and need no network. The model can be swapped behind the
`Drafter` port. Server-side refusal fallbacks are not used because the template fallback is a
stricter guarantee for this domain.
