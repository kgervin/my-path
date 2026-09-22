"""ASGI middleware: request IDs, RED metrics, access logs and security headers."""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from my_path.core.logging import request_id_var
from my_path.core.metrics import HTTP_LATENCY, HTTP_REQUESTS

logger = logging.getLogger("my_path.access")

REQUEST_ID_HEADER = "X-Request-ID"
_UNMATCHED = "unmatched"
_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
}


def _route_template(request: Request) -> str:
    """Label metrics by route template, never raw path, to keep cardinality bounded.

    The router stores the matched route in the ASGI scope, so read it after the call.
    """
    route = request.scope.get("route")
    return str(getattr(route, "path", _UNMATCHED))


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
        finally:
            elapsed = time.perf_counter() - started
            route = _route_template(request)
            HTTP_LATENCY.labels(route, request.method).observe(elapsed)
            HTTP_REQUESTS.labels(route, request.method, f"{status // 100}xx").inc()
            logger.info(
                "http_request",
                extra={
                    "method": request.method,
                    "route": route,
                    "status": status,
                    "duration_ms": round(elapsed * 1000, 2),
                },
            )
            request_id_var.reset(token)
        response.headers[REQUEST_ID_HEADER] = request_id
        response.headers.update(_SECURITY_HEADERS)
        return response
