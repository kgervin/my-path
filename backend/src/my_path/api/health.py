"""Liveness, readiness and Prometheus scrape endpoints (unversioned, not under /api)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Response, status
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy.exc import SQLAlchemyError

from my_path.api.dependencies import ContainerDep

router = APIRouter(tags=["ops"], include_in_schema=False)
logger = logging.getLogger(__name__)


@router.get("/healthz")
async def healthz(container: ContainerDep) -> dict[str, str]:
    """Liveness: the process is up. Never checks dependencies (avoids restart storms)."""
    return {"status": "ok", "release": container.settings.release}


@router.get("/readyz")
async def readyz(container: ContainerDep, response: Response) -> dict[str, str]:
    """Readiness: can serve traffic. Fails when the database is unreachable."""
    try:
        await container.database.ping()
    except (SQLAlchemyError, OSError):
        logger.exception("readiness_failed")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unavailable", "database": "down"}
    return {"status": "ready", "database": "up", "drafter": container.drafting.drafter_name}


@router.get("/metrics")
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
