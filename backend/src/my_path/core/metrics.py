"""Prometheus metrics. Names follow the ``<app>_<noun>_<unit>`` convention.

These back the SLIs in docs/sre/slos.md: request latency/availability and draft quality.
"""

from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram

HTTP_REQUESTS = Counter(
    "my_path_http_requests_total",
    "HTTP requests by route template, method and status class.",
    ["route", "method", "status"],
)
HTTP_LATENCY = Histogram(
    "my_path_http_request_duration_seconds",
    "HTTP request latency by route template.",
    ["route", "method"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)
FLAGS_CREATED = Counter(
    "my_path_flags_created_total", "Barriers detected by the rules engine.", ["barrier"]
)
DRAFTS = Counter(
    "my_path_drafts_total",
    "Drafts produced, by drafter and outcome (ok, fallback).",
    ["drafter", "outcome"],
)
DRAFT_LATENCY = Histogram(
    "my_path_draft_duration_seconds",
    "Time to produce one validated draft.",
    ["drafter"],
    buckets=(0.005, 0.05, 0.25, 0.5, 1, 2, 5, 10, 30),
)
COACH_ACTIONS = Counter(
    "my_path_coach_actions_total", "Coach decisions on flagged students.", ["action"]
)
RUNS_IN_PROGRESS = Gauge("my_path_runs_in_progress", "Runs currently drafting.")
