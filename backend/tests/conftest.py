from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date
from pathlib import Path

import httpx
import pytest

from my_path.container import build_container
from my_path.core.config import RuleThresholds, Settings
from my_path.domain.models import Assessment, Language, StudentRecord
from my_path.domain.rules import RuleContext, assess
from my_path.main import create_app

AS_OF = date(2026, 9, 22)


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        environment="test",
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'test.db'}",
        log_level="WARNING",
    )


@pytest.fixture
def ctx() -> RuleContext:
    return RuleContext(as_of=AS_OF, thresholds=RuleThresholds())


def make_record(**overrides: object) -> StudentRecord:
    base: dict[str, object] = {
        "student_id": "S0001",
        "first_name": "Maria",
        "program": "BS Psychology",
        "term_start": date(2026, 8, 20),
        "drop_date": date(2026, 10, 1),
        "balance_usd": 0.0,
        "hold_codes": (),
        "last_payment_status": "paid",
        "aid_items_missing": (),
        "last_lms_login": date(2026, 9, 20),
        "next_term_credits": 6,
        "first_gen": True,
        "preferred_language": Language.EN,
    }
    base.update(overrides)
    return StudentRecord(**base)  # type: ignore[arg-type]


def make_assessment(ctx: RuleContext, **overrides: object) -> Assessment:
    return assess(make_record(**overrides), ctx)


@pytest.fixture
async def client(settings: Settings) -> AsyncIterator[httpx.AsyncClient]:
    app = create_app(settings, build_container(settings))
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            yield c
