from __future__ import annotations

from my_path.container import build_container
from my_path.core.config import Settings
from my_path.domain.models import Assessment, Draft, Language, Tone
from my_path.persistence.repository import Repository
from my_path.services.runs import RunStatus
from my_path.synthetic import generate
from tests.conftest import AS_OF


class _ExplodingDrafter:
    name = "exploding"

    async def draft(self, assessment: Assessment, language: Language, tone: Tone) -> Draft:
        raise RuntimeError("unexpected outage")


async def test_unexpected_drafting_error_marks_run_failed(settings: Settings) -> None:
    container = build_container(settings, drafter=_ExplodingDrafter())
    await container.database.create_schema()
    run = await container.runs.create_run(
        generate(50, as_of=AS_OF).to_csv().encode(), "s.csv", AS_OF
    )
    await container.runs.draft_run(run.id)

    async with container.database.sessionmaker() as session:
        stored = await Repository(session).get_run(run.id)
    assert stored is not None
    assert stored.status == RunStatus.FAILED
    await container.database.dispose()


async def test_resume_finishes_runs_interrupted_mid_draft(settings: Settings) -> None:
    container = build_container(settings)
    await container.database.create_schema()
    run = await container.runs.create_run(
        generate(50, as_of=AS_OF).to_csv().encode(), "s.csv", AS_OF
    )
    assert run.status == RunStatus.PROCESSING  # simulates a pod restart before drafting

    await container.runs.resume_incomplete_runs()

    async with container.database.sessionmaker() as session:
        repo = Repository(session)
        stored = await repo.get_run(run.id)
        assert stored is not None
        assert stored.status == RunStatus.READY
        assert stored.drafted_count == stored.flagged_count
        assert await repo.undrafted_flags(run.id) == []
    await container.database.dispose()
