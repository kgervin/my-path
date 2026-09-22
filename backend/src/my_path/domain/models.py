"""Core domain types. Pure data: no I/O, no framework imports."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import StrEnum


class Barrier(StrEnum):
    SMALL_BALANCE = "small_balance"
    REGISTRATION_HOLD = "registration_hold"
    FAILED_PAYMENT = "failed_payment"
    MISSING_AID_DOCUMENT = "missing_aid_document"
    SILENT_STUDENT = "silent_student"
    NOT_REGISTERED_NEXT_TERM = "not_registered_next_term"


class Route(StrEnum):
    COACH = "coach"
    BURSAR = "bursar"
    AID_OFFICE = "aid_office"


class FlagStatus(StrEnum):
    NEW = "new"
    APPROVED = "approved"
    EDITED = "edited"
    DISMISSED = "dismissed"
    ROUTED = "routed"


class Language(StrEnum):
    EN = "en"
    ES = "es"


class Tone(StrEnum):
    WARM = "warm"
    BRIEF = "brief"


class DraftSource(StrEnum):
    AI = "ai"
    TEMPLATE = "template"


BARRIER_ROUTES: dict[Barrier, tuple[Route, ...]] = {
    Barrier.SMALL_BALANCE: (Route.COACH, Route.BURSAR),
    Barrier.REGISTRATION_HOLD: (Route.COACH,),
    Barrier.FAILED_PAYMENT: (Route.COACH, Route.BURSAR),
    Barrier.MISSING_AID_DOCUMENT: (Route.AID_OFFICE,),
    Barrier.SILENT_STUDENT: (Route.COACH,),
    Barrier.NOT_REGISTERED_NEXT_TERM: (Route.COACH,),
}


@dataclass(frozen=True, slots=True)
class StudentRecord:
    student_id: str
    first_name: str
    program: str
    term_start: date
    drop_date: date
    balance_usd: float
    hold_codes: tuple[str, ...]
    last_payment_status: str
    aid_items_missing: tuple[str, ...]
    last_lms_login: date | None
    next_term_credits: int
    first_gen: bool
    preferred_language: Language


@dataclass(frozen=True, slots=True)
class BarrierFinding:
    """One detected barrier plus the exact source fields that triggered it."""

    barrier: Barrier
    source_fields: dict[str, str]


@dataclass(frozen=True, slots=True)
class Assessment:
    """Everything the rules engine decided about one student."""

    record: StudentRecord
    days_to_drop: int
    findings: tuple[BarrierFinding, ...]

    @property
    def barriers(self) -> tuple[Barrier, ...]:
        return tuple(f.barrier for f in self.findings)

    @property
    def routes(self) -> tuple[Route, ...]:
        seen: dict[Route, None] = {}
        for barrier in self.barriers:
            seen.update(dict.fromkeys(BARRIER_ROUTES[barrier]))
        return tuple(seen)

    @property
    def source_fields(self) -> dict[str, str]:
        merged: dict[str, str] = {"drop_date": self.record.drop_date.isoformat()}
        for finding in self.findings:
            merged.update(finding.source_fields)
        return merged


@dataclass(frozen=True, slots=True)
class Draft:
    explanation: str
    message: str
    source: DraftSource
    language: Language
    fields_used: tuple[str, ...] = field(default_factory=tuple)
