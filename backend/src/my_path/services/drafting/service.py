"""Drafting orchestration: call the configured drafter, validate, fall back to a template."""

from __future__ import annotations

import logging
import time

from my_path.core.metrics import DRAFT_LATENCY, DRAFTS
from my_path.domain.models import Assessment, Draft, Language, Tone
from my_path.services.drafting.base import Drafter, DraftingError
from my_path.services.drafting.guardrails import check_draft
from my_path.services.drafting.templates import template_draft

logger = logging.getLogger(__name__)


class DraftingService:
    def __init__(self, drafter: Drafter) -> None:
        self._drafter = drafter

    @property
    def drafter_name(self) -> str:
        return self._drafter.name

    async def draft(
        self, assessment: Assessment, language: Language | None = None, tone: Tone = Tone.WARM
    ) -> Draft:
        lang = language or assessment.record.preferred_language
        started = time.perf_counter()
        try:
            draft = await self._drafter.draft(assessment, lang, tone)
            result = check_draft(draft, assessment)
            if not result.ok:
                raise DraftingError("; ".join(result.violations))
        except DraftingError as exc:
            logger.warning(
                "draft_fallback",
                extra={
                    "drafter": self._drafter.name,
                    "student_id": assessment.record.student_id,
                    "reason": str(exc),
                },
            )
            DRAFTS.labels(self._drafter.name, "fallback").inc()
            return template_draft(assessment, lang, tone)
        finally:
            DRAFT_LATENCY.labels(self._drafter.name).observe(time.perf_counter() - started)

        DRAFTS.labels(self._drafter.name, "ok").inc()
        return draft
