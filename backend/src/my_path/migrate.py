"""Apply database migrations from Python, so hosts need no shell around the start command."""

from __future__ import annotations

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config

logger = logging.getLogger(__name__)


def upgrade_to_head(config_path: Path) -> None:
    """Run ``alembic upgrade head``. Idempotent: a no-op when the schema is current."""
    if not config_path.is_file():
        raise FileNotFoundError(f"Alembic config not found at {config_path}")
    logger.info("migrations_start", extra={"config": str(config_path)})
    command.upgrade(Config(str(config_path)), "head")
    logger.info("migrations_done")
