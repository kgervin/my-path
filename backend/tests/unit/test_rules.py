from __future__ import annotations

from datetime import date

import pytest

from my_path.core.config import RuleThresholds
from my_path.domain.models import Barrier, Route
from my_path.domain.rules import RuleContext, assess, flag_students
from my_path.services.ingestion import parse_students
from my_path.synthetic import generate
from tests.conftest import AS_OF, make_assessment, make_record


def test_healthy_student_is_not_flagged(ctx: RuleContext) -> None:
    assert make_assessment(ctx).findings == ()


@pytest.mark.parametrize(
    ("overrides", "barrier", "field"),
    [
        (
            {"balance_usd": 280.0, "drop_date": date(2026, 10, 1)},
            Barrier.SMALL_BALANCE,
            "balance_usd",
        ),
        ({"hold_codes": ("BURSAR_HOLD",)}, Barrier.REGISTRATION_HOLD, "hold_codes"),
        ({"last_payment_status": "failed"}, Barrier.FAILED_PAYMENT, "last_payment_status"),
        (
            {"aid_items_missing": ("verification_worksheet",)},
            Barrier.MISSING_AID_DOCUMENT,
            "aid_items_missing",
        ),
        ({"last_lms_login": date(2026, 9, 12)}, Barrier.SILENT_STUDENT, "last_lms_login"),
        ({"last_lms_login": None}, Barrier.SILENT_STUDENT, "last_lms_login"),
        ({"next_term_credits": 0}, Barrier.NOT_REGISTERED_NEXT_TERM, "next_term_credits"),
    ],
)
def test_each_rule_flags_and_cites_its_field(
    ctx: RuleContext, overrides: dict[str, object], barrier: Barrier, field: str
) -> None:
    assessment = make_assessment(ctx, **overrides)
    assert assessment.barriers == (barrier,)
    assert field in assessment.findings[0].source_fields
    assert "drop_date" in assessment.source_fields


@pytest.mark.parametrize(
    ("balance", "drop_date", "flagged"),
    [
        (1000.0, date(2026, 10, 13), True),  # upper bounds inclusive: $1000, 21 days
        (1000.01, date(2026, 10, 1), False),
        (0.0, date(2026, 10, 1), False),
        (50.0, date(2026, 10, 14), False),  # 22 days out
        (50.0, date(2026, 9, 21), False),  # drop date passed
    ],
)
def test_small_balance_boundaries(
    ctx: RuleContext, balance: float, drop_date: date, flagged: bool
) -> None:
    assessment = make_assessment(ctx, balance_usd=balance, drop_date=drop_date)
    assert (Barrier.SMALL_BALANCE in assessment.barriers) is flagged


def test_silent_student_waits_for_add_drop_to_close(ctx: RuleContext) -> None:
    assessment = make_assessment(ctx, term_start=date(2026, 9, 18), last_lms_login=None)
    assert assessment.findings == ()


def test_silent_student_boundary_is_ten_days(ctx: RuleContext) -> None:
    assert make_assessment(ctx, last_lms_login=date(2026, 9, 13)).findings == ()
    assert make_assessment(ctx, last_lms_login=date(2026, 9, 12)).barriers == (
        Barrier.SILENT_STUDENT,
    )


def test_next_term_rule_respects_registration_window() -> None:
    closed = RuleContext(AS_OF, RuleThresholds(next_term_registration_open=False))
    assert assess(make_record(next_term_credits=0), closed).findings == ()


def test_routes_are_deduplicated_in_order(ctx: RuleContext) -> None:
    assessment = make_assessment(
        ctx,
        last_payment_status="failed",
        aid_items_missing=("tax_transcript",),
        hold_codes=("X",),
    )
    assert assessment.routes == (Route.COACH, Route.BURSAR, Route.AID_OFFICE)


def test_queue_sorted_by_days_then_barrier_count(ctx: RuleContext) -> None:
    records = [
        make_record(student_id="LATE", drop_date=date(2026, 10, 30), hold_codes=("H",)),
        make_record(student_id="ONE", drop_date=date(2026, 9, 25), hold_codes=("H",)),
        make_record(
            student_id="TWO",
            drop_date=date(2026, 9, 25),
            hold_codes=("H",),
            last_payment_status="failed",
        ),
        make_record(student_id="OK"),
    ]
    assert [a.record.student_id for a in flag_students(records, ctx)] == ["TWO", "ONE", "LATE"]


@pytest.mark.parametrize("seed", [1, 7, 42, 2026])
def test_rules_detect_every_seeded_barrier(ctx: RuleContext, seed: int) -> None:
    """PRD success metric: 100% recall on seeded barriers, no false positives."""
    dataset = generate(200, as_of=AS_OF, seed=seed)
    records = parse_students(dataset.to_csv().encode(), max_rows=5000)
    detected = {a.record.student_id: set(a.barriers) for a in flag_students(records, ctx)}
    assert detected == {sid: set(b) for sid, b in dataset.seeded.items()}
    assert 0.10 <= len(detected) / 200 <= 0.15
    assert set().union(*detected.values()) == set(Barrier)
