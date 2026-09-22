"""Translate between domain objects and persisted rows."""

from __future__ import annotations

from dataclasses import asdict
from datetime import date
from typing import Any

from my_path.domain.models import (
    Assessment,
    Barrier,
    BarrierFinding,
    FlagStatus,
    Language,
    StudentRecord,
)
from my_path.persistence.tables import FlagRow


def record_to_dict(record: StudentRecord) -> dict[str, Any]:
    data = asdict(record)
    for key in ("term_start", "drop_date", "last_lms_login"):
        data[key] = data[key].isoformat() if data[key] else None
    data["hold_codes"] = list(record.hold_codes)
    data["aid_items_missing"] = list(record.aid_items_missing)
    data["preferred_language"] = record.preferred_language.value
    return data


def record_from_dict(data: dict[str, Any]) -> StudentRecord:
    login = data["last_lms_login"]
    return StudentRecord(
        student_id=data["student_id"],
        first_name=data["first_name"],
        program=data["program"],
        term_start=date.fromisoformat(data["term_start"]),
        drop_date=date.fromisoformat(data["drop_date"]),
        balance_usd=float(data["balance_usd"]),
        hold_codes=tuple(data["hold_codes"]),
        last_payment_status=data["last_payment_status"],
        aid_items_missing=tuple(data["aid_items_missing"]),
        last_lms_login=date.fromisoformat(login) if login else None,
        next_term_credits=int(data["next_term_credits"]),
        first_gen=bool(data["first_gen"]),
        preferred_language=Language(data["preferred_language"]),
    )


def assessment_to_row(assessment: Assessment) -> FlagRow:
    record = assessment.record
    return FlagRow(
        student_id=record.student_id,
        first_name=record.first_name,
        program=record.program,
        record=record_to_dict(record),
        barrier_types=[b.value for b in assessment.barriers],
        findings=[
            {"barrier": f.barrier.value, "source_fields": f.source_fields}
            for f in assessment.findings
        ],
        barrier_count=len(assessment.findings),
        days_to_drop=assessment.days_to_drop,
        source_fields=assessment.source_fields,
        route_to=[r.value for r in assessment.routes],
        status=FlagStatus.NEW.value,
    )


def assessment_from_row(row: FlagRow) -> Assessment:
    """Rebuild the assessment for re-drafting, using the findings captured at flag time."""
    findings = tuple(
        BarrierFinding(Barrier(f["barrier"]), dict(f["source_fields"])) for f in row.findings
    )
    return Assessment(
        record=record_from_dict(row.record), days_to_drop=row.days_to_drop, findings=findings
    )
