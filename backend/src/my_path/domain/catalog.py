"""Human-readable barrier catalog, shown in the UI and help pages (plain language).

Descriptions are rendered from the live thresholds so the UI never drifts from the rules.
"""

from __future__ import annotations

from dataclasses import dataclass

from my_path.core.config import RuleThresholds
from my_path.domain.models import BARRIER_ROUTES, Barrier

_LABELS: dict[Barrier, str] = {
    Barrier.SMALL_BALANCE: "Small unpaid balance",
    Barrier.REGISTRATION_HOLD: "Registration hold",
    Barrier.FAILED_PAYMENT: "Failed payment",
    Barrier.MISSING_AID_DOCUMENT: "Missing aid document",
    Barrier.SILENT_STUDENT: "Silent student",
    Barrier.NOT_REGISTERED_NEXT_TERM: "Not registered for next term",
}

_DESCRIPTIONS: dict[Barrier, str] = {
    Barrier.SMALL_BALANCE: "Owes more than $0 and up to ${t.small_balance_max_usd:,.0f}, and the "
    "drop date is within {t.small_balance_drop_window_days} days.",
    Barrier.REGISTRATION_HOLD: "Has at least one active hold on their account.",
    Barrier.FAILED_PAYMENT: "Their most recent payment did not go through.",
    Barrier.MISSING_AID_DOCUMENT: "A financial aid verification item is still outstanding.",
    Barrier.SILENT_STUDENT: "No course login for {t.silent_after_days} or more days after "
    "add/drop closed.",
    Barrier.NOT_REGISTERED_NEXT_TERM: "Registration is open and they have 0 credits next term.",
}


# "Suggested fix" column of the PRD barrier catalog, in coach-facing words.
_FIXES: dict[Barrier, str] = {
    Barrier.SMALL_BALANCE: "Share the payment plan link or emergency aid information.",
    Barrier.REGISTRATION_HOLD: "Explain the hold and how to clear it.",
    Barrier.FAILED_PAYMENT: "Ask them to update their payment method.",
    Barrier.MISSING_AID_DOCUMENT: "Send the link to the specific aid form.",
    Barrier.SILENT_STUDENT: "Send a friendly check-in message.",
    Barrier.NOT_REGISTERED_NEXT_TERM: "Send a registration reminder with the advisor link.",
}


@dataclass(frozen=True, slots=True)
class CatalogEntry:
    barrier: Barrier
    label: str
    description: str
    suggested_fix: str
    routes_to: tuple[str, ...]


def catalog(thresholds: RuleThresholds) -> list[CatalogEntry]:
    return [
        CatalogEntry(
            barrier=b,
            label=_LABELS[b],
            description=_DESCRIPTIONS[b].format(t=thresholds),
            suggested_fix=_FIXES[b],
            routes_to=tuple(r.value for r in BARRIER_ROUTES[b]),
        )
        for b in Barrier
    ]
