"""Composition root: the one place that wires concrete implementations together."""

from __future__ import annotations

from dataclasses import dataclass

import anthropic

from my_path.core.config import Settings
from my_path.persistence.database import Database
from my_path.services.drafting.anthropic_drafter import AnthropicDrafter
from my_path.services.drafting.base import Drafter
from my_path.services.drafting.service import DraftingService
from my_path.services.drafting.template_drafter import TemplateDrafter
from my_path.services.runs import RunService


@dataclass(slots=True)
class Container:
    settings: Settings
    database: Database
    drafting: DraftingService
    runs: RunService


def build_drafter(settings: Settings) -> Drafter:
    if settings.drafter == "anthropic":
        client = anthropic.AsyncAnthropic(timeout=settings.anthropic_timeout_seconds)
        return AnthropicDrafter(client, settings.anthropic_model)
    return TemplateDrafter()


def build_container(settings: Settings, drafter: Drafter | None = None) -> Container:
    database = Database(settings.database_url)
    drafting = DraftingService(drafter or build_drafter(settings))
    runs = RunService(database.sessionmaker, drafting, settings)
    return Container(settings=settings, database=database, drafting=drafting, runs=runs)
