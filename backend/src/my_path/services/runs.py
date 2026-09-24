"""Run lifecycle: ingest CSV -> rules -> persist flags -> draft in the background."""

from __future__ import annotations

import asyncio
import logging
from datetime import date
from enum import StrEnum

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from my_path.core.config import Settings
from my_path.core.metrics import FLAGS_CREATED, RUNS_IN_PROGRESS
from my_path.domain.models import Draft
from my_path.domain.rules import RuleContext, flag_students
from my_path.persistence.mappers import assessment_from_row, assessment_to_row
from my_path.persistence.repository import Repository
from my_path.persistence.tables import FlagRow, RunRow
from my_path.services.drafting.service import DraftingService
from my_path.services.ingestion import parse_students

logger = logging.getLogger(__name__)


class RunStatus(StrEnum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


def apply_draft(flag: FlagRow, draft: Draft) -> None:
    flag.explanation = draft.explanation
    flag.original_draft = draft.message
    flag.draft_message = draft.message
    flag.draft_source = draft.source.value
    flag.draft_language = draft.language.value


class RunService:
    def __init__(
        self,
        sessionmaker: async_sessionmaker[AsyncSession],
        drafting: DraftingService,
        settings: Settings,
    ) -> None:
        self._sessionmaker = sessionmaker
        self._drafting = drafting
        self._settings = settings

    async def create_run(self, content: bytes, filename: str, as_of: date) -> RunRow:
        """Validate and flag synchronously (fast); drafting happens in ``draft_run``."""
        records = parse_students(content, max_rows=self._settings.max_rows)
        assessments = flag_students(records, RuleContext(as_of, self._settings.thresholds))
        run = RunRow(
            filename=filename,
            as_of=as_of,
            status=(RunStatus.PROCESSING if assessments else RunStatus.READY).value,
            total_records=len(records),
            flagged_count=len(assessments),
            drafted_count=0,
            flags=[assessment_to_row(a) for a in assessments],
        )
        async with self._sessionmaker() as session:
            session.add(run)
            await session.commit()
        for assessment in assessments:
            for barrier in assessment.barriers:
                FLAGS_CREATED.labels(barrier.value).inc()
        logger.info(
            "run_created",
            extra={"run_id": run.id, "records": len(records), "flagged": len(assessments)},
        )
        return run

    async def draft_run(self, run_id: str) -> None:
        """Draft every undrafted flag with bounded concurrency; safe to call again to resume."""
        RUNS_IN_PROGRESS.inc()
        try:
            async with self._sessionmaker() as session:
                pending = await Repository(session).undrafted_flags(run_id)
            limit = asyncio.Semaphore(self._settings.llm_max_concurrency)
            # TaskGroup cancels in-flight drafts as soon as one fails (gather would leave
            # them running, holding connections after the run is marked failed).
            async with asyncio.TaskGroup() as group:
                for flag in pending:
                    group.create_task(self._draft_one(flag, limit))
            await self._set_status(run_id, RunStatus.READY)
        except Exception:
            logger.exception("run_drafting_failed", extra={"run_id": run_id})
            await self._set_status(run_id, RunStatus.FAILED)
        finally:
            RUNS_IN_PROGRESS.dec()

    async def resume_incomplete_runs(self) -> None:
        """Called at startup so a restart mid-run never leaves a run stuck in processing."""
        async with self._sessionmaker() as session:
            runs = await Repository(session).runs_with_status(RunStatus.PROCESSING.value)
        for run in runs:
            await self.draft_run(run.id)

    async def _draft_one(self, flag: FlagRow, limit: asyncio.Semaphore) -> None:
        async with limit:
            draft = await self._drafting.draft(assessment_from_row(flag))
        async with self._sessionmaker() as session:
            repo = Repository(session)
            row = await repo.get_flag(flag.id)
            if row is None or row.draft_message is not None:
                return
            apply_draft(row, draft)
            await repo.increment_drafted(flag.run_id)
            await repo.commit()

    async def _set_status(self, run_id: str, status: RunStatus) -> None:
        async with self._sessionmaker() as session:
            repo = Repository(session)
            run = await repo.get_run(run_id)
            if run is not None:
                run.status = status.value
                await repo.commit()
