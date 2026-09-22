"""Optional OpenTelemetry tracing. Enabled with MY_PATH_OTEL_ENABLED=true plus the standard
OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_SERVICE_NAME variables. Requires the ``tracing`` extra."""

from __future__ import annotations

import logging

from fastapi import FastAPI

logger = logging.getLogger(__name__)


def instrument(app: FastAPI) -> None:
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:
        logger.warning("otel_not_installed", extra={"hint": "install my-path-api[tracing]"})
        return

    provider = TracerProvider()
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app, excluded_urls="healthz,readyz,metrics")
