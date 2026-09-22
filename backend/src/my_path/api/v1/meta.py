"""Reference data for the UI: required columns, barrier catalog, sample CSV."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from my_path.api.dependencies import ContainerDep
from my_path.api.schemas import BarrierInfo, MetaOut
from my_path.domain.catalog import catalog
from my_path.persistence.repository import URGENT_DAYS
from my_path.services.drafting.guardrails import MAX_WORDS
from my_path.services.ingestion import REQUIRED_COLUMNS
from my_path.synthetic import generate

router = APIRouter(tags=["meta"])


@router.get("/meta")
async def meta(container: ContainerDep) -> MetaOut:
    settings = container.settings
    return MetaOut(
        required_columns=list(REQUIRED_COLUMNS),
        barriers=[
            BarrierInfo(
                id=e.barrier.value,
                label=e.label,
                description=e.description,
                routes_to=list(e.routes_to),
            )
            for e in catalog(settings.thresholds)
        ],
        max_upload_bytes=settings.max_upload_bytes,
        max_words=MAX_WORDS,
        urgent_days=URGENT_DAYS,
    )


@router.get("/sample-data.csv", response_class=PlainTextResponse)
async def sample_data(rows: int = 200, seed: int = 42) -> PlainTextResponse:
    """Synthetic records dated relative to today, so the demo always has upcoming drop dates."""
    dataset = generate(min(max(rows, 1), 1000), as_of=date.today(), seed=seed)
    return PlainTextResponse(
        dataset.to_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="my-path-sample.csv"'},
    )
