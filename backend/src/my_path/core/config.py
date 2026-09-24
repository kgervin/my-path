"""Application settings, loaded from environment variables (12-factor)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class RuleThresholds(BaseModel):
    """Barrier thresholds. Placeholders until confirmed with coaching and aid staff."""

    small_balance_max_usd: float = 1000.0
    small_balance_drop_window_days: int = 21
    silent_after_days: int = 10
    add_drop_period_days: int = 7
    next_term_registration_open: bool = True


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="MY_PATH_",
        env_nested_delimiter="__",
        env_file=".env",
        extra="ignore",
    )

    environment: Literal["local", "test", "staging", "production"] = "local"
    # Git commit the running build came from (set at image build time). Lets a deploy pipeline
    # confirm the new version is live before testing it.
    release: str = "dev"
    log_level: str = "INFO"
    database_url: str = "sqlite+aiosqlite:///./my_path.db"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    max_upload_bytes: int = 2 * 1024 * 1024
    max_rows: int = 5000

    drafter: Literal["template", "anthropic"] = "template"
    anthropic_model: str = "claude-opus-5"
    anthropic_timeout_seconds: float = 30.0
    llm_max_concurrency: int = 8

    thresholds: RuleThresholds = Field(default_factory=RuleThresholds)

    otel_enabled: bool = False

    # Run `alembic upgrade head` before serving. For hosts without a pre-deploy step (Render
    # free). Kubernetes and Fly keep this off and migrate in a Job / release command instead.
    migrate_on_start: bool = False
    alembic_config: Path = Path("alembic.ini")


@lru_cache
def get_settings() -> Settings:
    return Settings()
