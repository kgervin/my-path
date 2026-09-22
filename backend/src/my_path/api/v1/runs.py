"""Run endpoints: upload a CSV, poll progress, read the queue and summary."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, UploadFile, status

from my_path.api.dependencies import ContainerDep, RepositoryDep
from my_path.api.schemas import Counters, FlagQuery, FlagSummaryOut, RunOut, SummaryOut
from my_path.domain.errors import InvalidActionError, NotFoundError
from my_path.domain.models import FlagStatus
from my_path.persistence.repository import FlagFilters, Repository
from my_path.persistence.tables import RunRow

router = APIRouter(prefix="/runs", tags=["runs"])


async def _get_run(repo: Repository, run_id: str) -> RunRow:
    run = await repo.get_run(run_id)
    if run is None:
        raise NotFoundError(f"No run with id {run_id}.")
    return run


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_run(
    container: ContainerDep,
    background: BackgroundTasks,
    file: Annotated[UploadFile, File(description="CSV of synthetic student records")],
    as_of: Annotated[date | None, Form(description="Evaluate rules as of this date")] = None,
) -> RunOut:
    limit = container.settings.max_upload_bytes
    content = await file.read(limit + 1)
    if len(content) > limit:
        raise InvalidActionError(f"The file is larger than {limit // 1024} KB.")
    run = await container.runs.create_run(
        content, file.filename or "upload.csv", as_of or date.today()
    )
    if run.flagged_count:
        background.add_task(container.runs.draft_run, run.id)
    return RunOut.model_validate(run)


@router.get("/latest")
async def latest_run(repo: RepositoryDep) -> RunOut:
    run = await repo.latest_run()
    if run is None:
        raise NotFoundError("No runs yet. Upload a CSV to start.")
    return RunOut.model_validate(run)


@router.get("/{run_id}")
async def get_run(run_id: str, repo: RepositoryDep) -> RunOut:
    return RunOut.model_validate(await _get_run(repo, run_id))


@router.get("/{run_id}/flags")
async def list_flags(
    run_id: str, repo: RepositoryDep, query: Annotated[FlagQuery, Query()]
) -> list[FlagSummaryOut]:
    await _get_run(repo, run_id)
    filters = FlagFilters(
        barrier=query.barrier.value if query.barrier else None,
        program=query.program,
        status=query.status.value if query.status else None,
        urgency=query.urgency,
    )
    rows = await repo.list_flags(run_id, filters)
    return [FlagSummaryOut.model_validate(r) for r in rows]


@router.get("/{run_id}/summary")
async def run_summary(run_id: str, repo: RepositoryDep) -> SummaryOut:
    run = await _get_run(repo, run_id)
    summary = await repo.summary(run_id)
    by_status = summary.by_status
    counters = Counters(
        flagged=run.flagged_count,
        pending=by_status.get(FlagStatus.NEW, 0),
        approved=by_status.get(FlagStatus.APPROVED, 0) + by_status.get(FlagStatus.EDITED, 0),
        routed=by_status.get(FlagStatus.ROUTED, 0),
        dismissed=by_status.get(FlagStatus.DISMISSED, 0),
        most_urgent_days_to_drop=summary.most_urgent_open_days,
    )
    return SummaryOut(
        run=RunOut.model_validate(run),
        counters=counters,
        by_status=by_status,
        by_barrier=summary.by_barrier,
        by_barrier_status=summary.by_barrier_status,
        programs=summary.programs,
    )
