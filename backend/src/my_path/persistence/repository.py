"""Data access. Services depend on this repository, never on SQL directly."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from enum import StrEnum

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from my_path.domain.models import FlagStatus
from my_path.persistence.tables import FlagRow, RunRow

URGENT_DAYS = 7
SOON_DAYS = 14


class Urgency(StrEnum):
    URGENT = "urgent"  # under 7 days
    SOON = "soon"  # 7 to 14 days
    LATER = "later"  # more than 14 days


@dataclass(frozen=True, slots=True)
class FlagFilters:
    barrier: str | None = None
    program: str | None = None
    status: str | None = None
    urgency: Urgency | None = None


@dataclass(frozen=True, slots=True)
class RunSummary:
    by_status: dict[str, int]
    by_barrier: dict[str, int]
    by_barrier_status: dict[str, dict[str, int]]
    programs: list[str]
    most_urgent_open_days: int | None


class Repository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def commit(self) -> None:
        await self.session.commit()

    async def get_run(self, run_id: str) -> RunRow | None:
        return await self.session.get(RunRow, run_id)

    async def latest_run(self) -> RunRow | None:
        stmt = select(RunRow).order_by(RunRow.created_at.desc()).limit(1)
        return (await self.session.scalars(stmt)).first()

    async def runs_with_status(self, status: str) -> list[RunRow]:
        return list(await self.session.scalars(select(RunRow).where(RunRow.status == status)))

    async def increment_drafted(self, run_id: str) -> None:
        await self.session.execute(
            update(RunRow).where(RunRow.id == run_id).values(drafted_count=RunRow.drafted_count + 1)
        )

    async def get_flag(self, flag_id: str, *, with_actions: bool = False) -> FlagRow | None:
        options = [selectinload(FlagRow.actions)] if with_actions else []
        return await self.session.get(FlagRow, flag_id, options=options)

    async def undrafted_flags(self, run_id: str) -> list[FlagRow]:
        stmt = select(FlagRow).where(FlagRow.run_id == run_id, FlagRow.draft_message.is_(None))
        return list(await self.session.scalars(stmt))

    async def list_flags(self, run_id: str, filters: FlagFilters) -> list[FlagRow]:
        stmt = select(FlagRow).where(FlagRow.run_id == run_id)
        if filters.program:
            stmt = stmt.where(FlagRow.program == filters.program)
        if filters.status:
            stmt = stmt.where(FlagRow.status == filters.status)
        if filters.urgency is Urgency.URGENT:
            stmt = stmt.where(FlagRow.days_to_drop < URGENT_DAYS)
        elif filters.urgency is Urgency.SOON:
            stmt = stmt.where(FlagRow.days_to_drop.between(URGENT_DAYS, SOON_DAYS))
        elif filters.urgency is Urgency.LATER:
            stmt = stmt.where(FlagRow.days_to_drop > SOON_DAYS)
        stmt = stmt.order_by(FlagRow.days_to_drop, FlagRow.barrier_count.desc(), FlagRow.student_id)
        rows = list(await self.session.scalars(stmt))
        # Barrier types live in a JSON array; filter portably in Python (<= a few hundred rows).
        if filters.barrier:
            rows = [r for r in rows if filters.barrier in r.barrier_types]
        return rows

    async def summary(self, run_id: str) -> RunSummary:
        status_rows = await self.session.execute(
            select(FlagRow.status, func.count())
            .where(FlagRow.run_id == run_id)
            .group_by(FlagRow.status)
        )
        barrier_rows = await self.session.execute(
            select(
                FlagRow.barrier_types, FlagRow.status, FlagRow.program, FlagRow.days_to_drop
            ).where(FlagRow.run_id == run_id)
        )
        by_barrier: Counter[str] = Counter()
        by_barrier_status: dict[str, Counter[str]] = {}
        programs: set[str] = set()
        open_days: list[int] = []
        for barriers, status, program, days in barrier_rows:
            programs.add(program)
            if status == FlagStatus.NEW:
                open_days.append(days)
            for barrier in barriers:
                by_barrier[barrier] += 1
                by_barrier_status.setdefault(barrier, Counter())[status] += 1
        return RunSummary(
            by_status=dict(status_rows.tuples().all()),
            by_barrier=dict(by_barrier),
            by_barrier_status={b: dict(c) for b, c in by_barrier_status.items()},
            programs=sorted(programs),
            most_urgent_open_days=min(open_days, default=None),
        )
