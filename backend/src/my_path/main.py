"""ASGI entrypoint and application factory."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from my_path.api import health
from my_path.api.errors import register_error_handlers
from my_path.api.v1 import flags, meta, runs
from my_path.container import Container, build_container
from my_path.core.config import Settings, get_settings
from my_path.core.logging import configure_logging
from my_path.core.middleware import ObservabilityMiddleware
from my_path.core.tracing import instrument

API_PREFIX = "/api/v1"


def create_app(settings: Settings | None = None, container: Container | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    container = container or build_container(settings)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        if settings.environment in ("local", "test"):
            await container.database.create_schema()
        resume = asyncio.create_task(container.runs.resume_incomplete_runs())
        yield
        resume.cancel()
        with suppress(asyncio.CancelledError):
            await resume
        await container.database.dispose()

    app = FastAPI(
        title="My Path API",
        version="0.1.0",
        summary="Flags small, fixable barriers and drafts coach outreach. Synthetic data only.",
        lifespan=lifespan,
    )
    app.state.container = container
    app.add_middleware(ObservabilityMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    register_error_handlers(app)
    app.include_router(health.router)
    for router in (runs.router, flags.router, meta.router):
        app.include_router(router, prefix=API_PREFIX)
    if settings.otel_enabled:
        instrument(app)
    return app
