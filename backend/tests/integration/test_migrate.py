from __future__ import annotations

from pathlib import Path

import pytest
import sqlalchemy as sa

from my_path.core.config import get_settings
from my_path.migrate import upgrade_to_head

ALEMBIC_INI = Path(__file__).parents[2] / "alembic.ini"


def test_upgrade_to_head_creates_schema_and_is_idempotent(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = tmp_path / "migrated.db"
    monkeypatch.setenv("MY_PATH_DATABASE_URL", f"sqlite+aiosqlite:///{db}")
    get_settings.cache_clear()
    try:
        upgrade_to_head(ALEMBIC_INI)
        upgrade_to_head(ALEMBIC_INI)  # second run is a no-op
    finally:
        get_settings.cache_clear()
    engine = sa.create_engine(f"sqlite:///{db}")
    try:
        tables = set(sa.inspect(engine).get_table_names())
    finally:
        engine.dispose()
    assert {"runs", "flags", "action_logs", "alembic_version"} <= tables


def test_upgrade_to_head_fails_clearly_without_config(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError, match="Alembic config not found"):
        upgrade_to_head(tmp_path / "missing.ini")
