"""Synthetic student records with seeded barriers. No real student data, ever.

Dates are generated relative to ``as_of`` so the demo stays meaningful on any day.
Run: ``uv run my-path-generate-data --rows 200 --out students.csv``
"""

from __future__ import annotations

import argparse
import csv
import io
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

from my_path.domain.models import Barrier
from my_path.services.ingestion import REQUIRED_COLUMNS

FIRST_NAMES = (
    "Maria", "James", "Aisha", "Wei", "Carlos", "Priya", "Daniel", "Fatima", "Jordan", "Lucia",
    "Kwame", "Emily", "Diego", "Mei", "Omar", "Sofia", "Tyler", "Amara", "Jose", "Hannah",
    "Luis", "Grace", "Andre", "Nadia", "Kenji", "Rosa", "Malik", "Chloe", "Ahmed", "Valeria",
)  # fmt: skip
PROGRAMS = (
    "BS Psychology",
    "BA Organizational Leadership",
    "BS Information Technology",
    "BS Nursing (RN-BSN)",
    "BA Communication",
)
HOLD_CODES = ("BURSAR_HOLD", "ADVISING_HOLD", "IMMUNIZATION_HOLD")
AID_ITEMS = ("verification_worksheet", "tax_transcript", "identity_statement")
DEFAULT_FLAG_RATE = 0.125
FIRST_GEN_RATE = 0.35
SPANISH_RATE = 0.2


@dataclass(frozen=True, slots=True)
class SyntheticDataset:
    rows: list[dict[str, str]]
    seeded: dict[str, frozenset[Barrier]]

    def to_csv(self) -> str:
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=REQUIRED_COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(self.rows)
        return buffer.getvalue()


def _healthy_row(rng: random.Random, index: int, as_of: date) -> dict[str, str]:
    return {
        "student_id": f"S{index:04d}",
        "first_name": rng.choice(FIRST_NAMES),
        "program": rng.choice(PROGRAMS),
        "term_start": (as_of - timedelta(days=30)).isoformat(),
        "drop_date": (as_of + timedelta(days=rng.randint(25, 45))).isoformat(),
        "balance_usd": "0",
        "hold_codes": "",
        "last_payment_status": "paid",
        "aid_items_missing": "",
        "last_lms_login": (as_of - timedelta(days=rng.randint(0, 5))).isoformat(),
        "next_term_credits": str(rng.choice((3, 6, 9, 12))),
        "first_gen": str(rng.random() < FIRST_GEN_RATE).lower(),
        "preferred_language": "es" if rng.random() < SPANISH_RATE else "en",
    }


def _seed(row: dict[str, str], barrier: Barrier, rng: random.Random, as_of: date) -> None:
    match barrier:
        case Barrier.SMALL_BALANCE:
            row["balance_usd"] = str(rng.randint(50, 1000))
            row["drop_date"] = (as_of + timedelta(days=rng.randint(2, 21))).isoformat()
        case Barrier.REGISTRATION_HOLD:
            row["hold_codes"] = rng.choice(HOLD_CODES)
        case Barrier.FAILED_PAYMENT:
            row["last_payment_status"] = "failed"
        case Barrier.MISSING_AID_DOCUMENT:
            row["aid_items_missing"] = rng.choice(AID_ITEMS)
        case Barrier.SILENT_STUDENT:
            row["last_lms_login"] = (as_of - timedelta(days=rng.randint(10, 25))).isoformat()
        case Barrier.NOT_REGISTERED_NEXT_TERM:
            row["next_term_credits"] = "0"


def generate(
    rows: int = 200, *, as_of: date, seed: int = 42, flag_rate: float = DEFAULT_FLAG_RATE
) -> SyntheticDataset:
    rng = random.Random(seed)  # noqa: S311 - synthetic data, not security sensitive
    data = [_healthy_row(rng, i + 1, as_of) for i in range(rows)]
    flagged = rng.sample(range(rows), k=max(1, round(rows * flag_rate)))
    barriers = list(Barrier)
    seeded: dict[str, frozenset[Barrier]] = {}
    for position, index in enumerate(flagged):
        # Cycle through barrier types so each one is seeded, sometimes adding a second.
        chosen = {barriers[position % len(barriers)]}
        chosen.update(rng.sample(barriers, k=rng.choice((0, 0, 1))))
        for barrier in chosen:
            _seed(data[index], barrier, rng, as_of)
        seeded[data[index]["student_id"]] = frozenset(chosen)
    return SyntheticDataset(rows=data, seeded=seeded)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=200)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--as-of", type=date.fromisoformat, default=date.today())
    parser.add_argument("--out", type=Path, default=Path("synthetic_students.csv"))
    args = parser.parse_args()
    dataset = generate(args.rows, as_of=args.as_of, seed=args.seed)
    args.out.write_text(dataset.to_csv(), encoding="utf-8")
    print(f"Wrote {args.rows} rows ({len(dataset.seeded)} seeded) to {args.out}")


if __name__ == "__main__":
    main()
