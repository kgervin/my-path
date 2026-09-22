# Service level objectives

SLOs cover what coaches feel. They are measured from Prometheus metrics the API exports
(`/metrics`), over a rolling **28-day** window. Recording rules and alerts live in
[`ops/prometheus/rules.yml`](../../ops/prometheus/rules.yml).

| SLI | Definition | SLO |
| --- | --- | --- |
| Availability | Share of API requests (excluding `/healthz`, `/readyz`, `/metrics`) that do not return 5xx | **99.5%** |
| Read latency | p95 duration of `GET /api/*` requests | **< 300 ms** |
| Draft quality | Share of AI drafts that pass guardrails without falling back to a template (only when `drafter=anthropic`) | **≥ 80%** |
| Drafting freshness | Runs finish drafting within 15 minutes of upload | **99%** |

Product metrics from the PRD (tracked on the dashboard, not paged on):

- Seeded barrier recall: 100% (enforced in CI by `test_rules_detect_every_seeded_barrier`).
- Drafts approved with no or minor edits: ≥ 70% (`approved` vs `edited` in the action log).
- Coach time per student: under 60 seconds (instrument in a pilot with client timing).

## Error budget

99.5% availability allows 0.5% failed requests: about **3.4 hours** of full outage in 28 days.
See the [error budget policy](error-budget-policy.md).

## Alerting

Multi-window, multi-burn-rate alerts (Google SRE Workbook, ch. 5):

| Alert | Condition | Severity |
| --- | --- | --- |
| `MyPathErrorBudgetFastBurn` | 14.4× burn over 1 h **and** 5 m | page |
| `MyPathErrorBudgetSlowBurn` | 6× burn over 6 h **and** 30 m | ticket |
| `MyPathReadLatencyHigh` | p95 > 300 ms for 10 m | ticket |
| `MyPathDraftFallbackHigh` | > 20% fallbacks for 15 m | ticket |
| `MyPathRunStuck` | a run drafting for > 15 m | ticket |
| `MyPathApiDown` | scrape target down for 2 m | page |

Each alert links to its runbook section. Alert logic is unit-tested with `promtool test rules`.
