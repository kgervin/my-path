from __future__ import annotations

from datetime import date

import pytest

from my_path.domain.models import Language
from my_path.services.ingestion import REQUIRED_COLUMNS, CsvValidationError, parse_students

HEADER = ",".join(REQUIRED_COLUMNS)
PRD_ROW = (
    "S0001,Maria,BS Psychology,2026-08-20,2026-10-01,280,,failed,verification_worksheet,"
    "2026-09-10,0,true,en"
)


def _csv(*rows: str, header: str = HEADER) -> bytes:
    return "\n".join((header, *rows)).encode()


def test_parses_prd_example_row() -> None:
    [record] = parse_students(_csv(PRD_ROW), max_rows=10)
    assert record.first_name == "Maria"
    assert record.drop_date == date(2026, 10, 1)
    assert record.balance_usd == 280
    assert record.aid_items_missing == ("verification_worksheet",)
    assert record.hold_codes == ()
    assert record.preferred_language is Language.EN


def test_accepts_bom_and_semicolon_or_pipe_lists() -> None:
    row = PRD_ROW.replace(",,failed", ",A;B|C,failed")
    content = b"\xef\xbb\xbf" + _csv(row)
    [record] = parse_students(content, max_rows=10)
    assert record.hold_codes == ("A", "B", "C")


def test_reports_missing_columns() -> None:
    with pytest.raises(CsvValidationError, match="Missing required columns: preferred_language"):
        parse_students(_csv(header=HEADER.replace(",preferred_language", "")), max_rows=10)


def test_reports_every_bad_cell_with_row_numbers() -> None:
    bad = "S0002,,BS X,not-a-date,2026-10-01,abc,,paid,,,,maybe,fr"
    with pytest.raises(CsvValidationError) as exc:
        parse_students(_csv(PRD_ROW, bad), max_rows=10)
    errors = exc.value.errors
    assert all(e.startswith("Row 3:") for e in errors)
    assert {"first_name", "term_start", "balance_usd", "first_gen", "preferred_language"} <= {
        e.split("'")[1] for e in errors
    }


def test_rejects_duplicate_ids() -> None:
    with pytest.raises(CsvValidationError, match="duplicate student_id 'S0001'"):
        parse_students(_csv(PRD_ROW, PRD_ROW), max_rows=10)


def test_rejects_too_many_rows() -> None:
    rows = [PRD_ROW.replace("S0001", f"S{i}") for i in range(3)]
    with pytest.raises(CsvValidationError, match="more than 2 rows"):
        parse_students(_csv(*rows), max_rows=2)


def test_rejects_non_utf8() -> None:
    with pytest.raises(CsvValidationError, match="UTF-8"):
        parse_students(b"\xff\xfe\x00", max_rows=10)


def test_rejects_header_only() -> None:
    with pytest.raises(CsvValidationError, match="no student rows"):
        parse_students(_csv(), max_rows=10)
