"""Map domain errors to RFC 9457 ``application/problem+json`` responses."""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from my_path.domain.errors import ConflictError, DomainError, InvalidActionError, NotFoundError
from my_path.services.ingestion import CsvValidationError

_STATUS: dict[type[DomainError], int] = {
    NotFoundError: status.HTTP_404_NOT_FOUND,
    ConflictError: status.HTTP_409_CONFLICT,
    InvalidActionError: status.HTTP_422_UNPROCESSABLE_CONTENT,
}


def problem(status_code: int, title: str, detail: str, **extra: object) -> JSONResponse:
    body = {"type": "about:blank", "title": title, "status": status_code, "detail": detail}
    return JSONResponse(
        body | extra, status_code=status_code, media_type="application/problem+json"
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain(_request: Request, exc: DomainError) -> JSONResponse:
        code = _STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST)
        return problem(code, exc.title, str(exc))

    @app.exception_handler(CsvValidationError)
    async def _csv(_request: Request, exc: CsvValidationError) -> JSONResponse:
        return problem(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "The file needs a few fixes",
            f"We found {len(exc.errors)} problem(s). Fix them and upload again.",
            errors=exc.errors,
        )
