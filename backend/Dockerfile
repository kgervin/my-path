# syntax=docker/dockerfile:1.7
# Multi-stage build: dependencies are resolved from the lockfile, the runtime image has no
# build tools, runs as a non-root user and ships only the virtualenv + source.

FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project --extra tracing
COPY src ./src
COPY migrations ./migrations
COPY alembic.ini README.md ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --extra tracing

FROM python:3.12-slim AS runtime
LABEL org.opencontainers.image.title="my-path-api" \
      org.opencontainers.image.description="My Path API" \
      org.opencontainers.image.licenses="UNLICENSED"
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app --no-create-home app
WORKDIR /app
COPY --from=build --chown=app:app /app /app
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    MY_PATH_DATABASE_URL="sqlite+aiosqlite:////data/my_path.db"
RUN mkdir /data && chown app:app /data
USER 10001
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request as r; r.urlopen('http://127.0.0.1:8000/healthz', timeout=2)"]
CMD ["python", "-m", "my_path"]
