"""``python -m my_path`` runs the API with uvicorn (used by the container image)."""

import os

import uvicorn

from my_path.core.config import get_settings
from my_path.core.logging import configure_logging
from my_path.migrate import upgrade_to_head

if __name__ == "__main__":
    settings = get_settings()
    if settings.migrate_on_start:
        configure_logging(settings.log_level)
        upgrade_to_head(settings.alembic_config)
    uvicorn.run(
        "my_path.main:create_app",
        factory=True,
        host=os.getenv("HOST", "0.0.0.0"),  # noqa: S104 - bound inside a container
        port=int(os.getenv("PORT", "8000")),
        proxy_headers=True,
        log_config=None,
    )
