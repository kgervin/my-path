"""Drafter port. Implementations turn a rules assessment into an explanation + outreach draft."""

from __future__ import annotations

from typing import Protocol

from my_path.domain.models import Assessment, Draft, Language, Tone


class DraftingError(RuntimeError):
    """Raised by a drafter when it cannot produce a usable draft; triggers template fallback."""


class Drafter(Protocol):
    name: str

    async def draft(self, assessment: Assessment, language: Language, tone: Tone) -> Draft: ...
