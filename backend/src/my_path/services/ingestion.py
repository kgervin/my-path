"""CSV ingestion and validation (FR-1).

Validation reports every problem at once, with row numbers, so a coach can fix the file in a
single pass instead of discovering errors one at a time.
"""

from __future__ import annotations

import csv
import io
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date
from typing import TypeVar

from my_path.domain.models import Language, StudentRecord

REQUIRED_COLUMNS: tuple[str, ...] = (
    "student_id",
    "first_name",
    "program",
    "term_start",
    "drop_date",
    "balance_usd",
    "hold_codes",
    "last_payment_status",
    "aid_items_missing",
    "last_lms_login",
    "next_term_credits",
    "first_gen",
    "preferred_language",
)

_TRUE = {"true", "1", "yes", "y"}
_FALSE = {"false", "0", "no", "n", ""}
_MAX_REPORTED_ERRORS = 50
_DATE_HINT = "a date like 2026-10-01"

T = TypeVar("T")


class CsvValidationError(ValueError):
    def __init__(self, errors: list[str]) -> None:
        super().__init__("; ".join(errors))
        self.errors = errors


@dataclass(slots=True)
class _RowParser:
    row: dict[str, str]
    line: int
    errors: list[str] = field(default_factory=list)

    def get(self, column: str, parse: Callable[[str], T], *, hint: str, default: T) -> T:
        """Parse one cell. On failure, record an error and return ``default`` (discarded)."""
        raw = (self.row.get(column) or "").strip()
        try:
            return parse(raw)
        except ValueError:
            self.errors.append(f"Row {self.line}: '{column}' should be {hint} (got '{raw}').")
            return default


def _required_text(raw: str) -> str:
    if not raw:
        raise ValueError
    return raw


def _float(raw: str) -> float:
    return float(raw or 0)


def _int(raw: str) -> int:
    return int(raw or 0)


def _optional_date(raw: str) -> date | None:
    return date.fromisoformat(raw) if raw else None


def _bool(raw: str) -> bool:
    value = raw.lower()
    if value in _TRUE:
        return True
    if value in _FALSE:
        return False
    raise ValueError


def _list(raw: str) -> tuple[str, ...]:
    return tuple(part.strip() for part in raw.replace("|", ";").split(";") if part.strip())


def _language(raw: str) -> Language:
    return Language(raw.lower() or Language.EN)


def _parse_row(p: _RowParser) -> StudentRecord | None:
    record = StudentRecord(
        student_id=p.get("student_id", _required_text, hint="non-empty", default=""),
        first_name=p.get("first_name", _required_text, hint="non-empty", default=""),
        program=p.get("program", _required_text, hint="non-empty", default=""),
        term_start=p.get("term_start", date.fromisoformat, hint=_DATE_HINT, default=date.min),
        drop_date=p.get("drop_date", date.fromisoformat, hint=_DATE_HINT, default=date.min),
        balance_usd=p.get("balance_usd", _float, hint="a number", default=0.0),
        hold_codes=p.get("hold_codes", _list, hint="a list", default=()),
        last_payment_status=p.get("last_payment_status", str.lower, hint="text", default=""),
        aid_items_missing=p.get("aid_items_missing", _list, hint="a list", default=()),
        last_lms_login=p.get(
            "last_lms_login", _optional_date, hint="a date or blank", default=None
        ),
        next_term_credits=p.get("next_term_credits", _int, hint="a whole number", default=0),
        first_gen=p.get("first_gen", _bool, hint="true or false", default=False),
        preferred_language=p.get(
            "preferred_language", _language, hint="'en' or 'es'", default=Language.EN
        ),
    )
    return None if p.errors else record


def _read_csv(content: bytes) -> csv.DictReader[str]:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise CsvValidationError(["The file must be UTF-8 encoded CSV."]) from exc
    reader = csv.DictReader(io.StringIO(text))
    header = [h.strip() for h in reader.fieldnames or []]
    missing = [c for c in REQUIRED_COLUMNS if c not in header]
    if missing:
        raise CsvValidationError([f"Missing required columns: {', '.join(missing)}."])
    reader.fieldnames = header
    return reader


def parse_students(content: bytes, *, max_rows: int) -> list[StudentRecord]:
    """Parse and validate a CSV upload. Raises ``CsvValidationError`` listing every problem."""
    records: list[StudentRecord] = []
    errors: list[str] = []
    seen_ids: set[str] = set()
    for line, row in enumerate(_read_csv(content), start=2):
        if line - 1 > max_rows:
            raise CsvValidationError([f"The file has more than {max_rows} rows."])
        parser = _RowParser(row=row, line=line)
        record = _parse_row(parser)
        errors.extend(parser.errors)
        if record is None:
            continue
        if record.student_id in seen_ids:
            errors.append(f"Row {line}: duplicate student_id '{record.student_id}'.")
            continue
        seen_ids.add(record.student_id)
        records.append(record)

    if errors:
        raise CsvValidationError(errors[:_MAX_REPORTED_ERRORS])
    if not records:
        raise CsvValidationError(["The file has a header but no student rows."])
    return records
