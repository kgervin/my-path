"""Deterministic barrier rules.

Each rule is a pure function ``(record, context) -> BarrierFinding | None``. Rules alone decide
who is flagged; the LLM only explains and drafts. Adding a barrier means adding one function
and one entry in ``RULES``.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import date, timedelta

from my_path.core.config import RuleThresholds
from my_path.domain.models import Assessment, Barrier, BarrierFinding, StudentRecord

FAILED_PAYMENT_STATUS = "failed"


@dataclass(frozen=True, slots=True)
class RuleContext:
    as_of: date
    thresholds: RuleThresholds

    def days_to_drop(self, record: StudentRecord) -> int:
        return (record.drop_date - self.as_of).days


Rule = Callable[[StudentRecord, RuleContext], BarrierFinding | None]


def small_balance(record: StudentRecord, ctx: RuleContext) -> BarrierFinding | None:
    t = ctx.thresholds
    within_window = 0 <= ctx.days_to_drop(record) <= t.small_balance_drop_window_days
    if 0 < record.balance_usd <= t.small_balance_max_usd and within_window:
        return BarrierFinding(Barrier.SMALL_BALANCE, {"balance_usd": f"{record.balance_usd:.2f}"})
    return None


def registration_hold(record: StudentRecord, _ctx: RuleContext) -> BarrierFinding | None:
    if record.hold_codes:
        return BarrierFinding(
            Barrier.REGISTRATION_HOLD, {"hold_codes": ";".join(record.hold_codes)}
        )
    return None


def failed_payment(record: StudentRecord, _ctx: RuleContext) -> BarrierFinding | None:
    if record.last_payment_status == FAILED_PAYMENT_STATUS:
        return BarrierFinding(
            Barrier.FAILED_PAYMENT, {"last_payment_status": record.last_payment_status}
        )
    return None


def missing_aid_document(record: StudentRecord, _ctx: RuleContext) -> BarrierFinding | None:
    if record.aid_items_missing:
        return BarrierFinding(
            Barrier.MISSING_AID_DOCUMENT,
            {"aid_items_missing": ";".join(record.aid_items_missing)},
        )
    return None


def silent_student(record: StudentRecord, ctx: RuleContext) -> BarrierFinding | None:
    t = ctx.thresholds
    add_drop_closed = ctx.as_of >= record.term_start + timedelta(days=t.add_drop_period_days)
    if not add_drop_closed:
        return None
    last_seen = record.last_lms_login
    if last_seen is None or (ctx.as_of - last_seen).days >= t.silent_after_days:
        value = last_seen.isoformat() if last_seen else "never"
        return BarrierFinding(Barrier.SILENT_STUDENT, {"last_lms_login": value})
    return None


def not_registered_next_term(record: StudentRecord, ctx: RuleContext) -> BarrierFinding | None:
    if ctx.thresholds.next_term_registration_open and record.next_term_credits == 0:
        return BarrierFinding(Barrier.NOT_REGISTERED_NEXT_TERM, {"next_term_credits": "0"})
    return None


RULES: tuple[Rule, ...] = (
    small_balance,
    registration_hold,
    failed_payment,
    missing_aid_document,
    silent_student,
    not_registered_next_term,
)


def assess(record: StudentRecord, ctx: RuleContext, rules: Iterable[Rule] = RULES) -> Assessment:
    findings = tuple(f for rule in rules if (f := rule(record, ctx)) is not None)
    return Assessment(record=record, days_to_drop=ctx.days_to_drop(record), findings=findings)


def flag_students(records: Iterable[StudentRecord], ctx: RuleContext) -> list[Assessment]:
    """Return assessments with at least one barrier, most urgent first (FR-5)."""
    flagged = [a for r in records if (a := assess(r, ctx)).findings]
    return sorted(flagged, key=lambda a: (a.days_to_drop, -len(a.findings), a.record.student_id))
