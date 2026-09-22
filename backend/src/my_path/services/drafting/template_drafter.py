"""Adapter exposing the deterministic templates through the ``Drafter`` port."""

from __future__ import annotations

from my_path.domain.models import Assessment, Draft, Language, Tone
from my_path.services.drafting.templates import template_draft


class TemplateDrafter:
    name = "template"

    async def draft(self, assessment: Assessment, language: Language, tone: Tone) -> Draft:
        return template_draft(assessment, language, tone)
