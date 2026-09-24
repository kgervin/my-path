from __future__ import annotations

from typing import Any

import httpx
import pytest

from my_path.synthetic import generate
from tests.conftest import AS_OF

pytestmark = pytest.mark.asyncio


async def _upload(
    client: httpx.AsyncClient, content: bytes, as_of: str = AS_OF.isoformat()
) -> httpx.Response:
    return await client.post(
        "/api/v1/runs",
        files={"file": ("students.csv", content, "text/csv")},
        data={"as_of": as_of},
    )


@pytest.fixture
async def run(client: httpx.AsyncClient) -> dict[str, Any]:
    response = await _upload(client, generate(200, as_of=AS_OF).to_csv().encode())
    assert response.status_code == 202, response.text
    run_id = response.json()["id"]
    # Template drafting runs as a background task that completes before the response returns.
    ready = (await client.get(f"/api/v1/runs/{run_id}")).json()
    assert ready["status"] == "ready"
    return dict(ready)


async def _first_flag(client: httpx.AsyncClient, run_id: str) -> dict[str, Any]:
    flags = (await client.get(f"/api/v1/runs/{run_id}/flags")).json()
    detail = await client.get(f"/api/v1/flags/{flags[0]['id']}")
    return dict(detail.json())


async def _act(client: httpx.AsyncClient, flag: dict[str, Any], **body: Any) -> httpx.Response:
    payload = {"coach": "Coach Kim", "version": flag["version"], **body}
    return await client.post(f"/api/v1/flags/{flag['id']}/actions", json=payload)


async def test_upload_flags_and_drafts_every_seeded_student(
    client: httpx.AsyncClient, run: dict[str, Any]
) -> None:
    assert run["total_records"] == 200
    assert run["flagged_count"] == run["drafted_count"] == 25


async def test_queue_is_sorted_by_urgency(client: httpx.AsyncClient, run: dict[str, Any]) -> None:
    flags = (await client.get(f"/api/v1/runs/{run['id']}/flags")).json()
    keys = [(f["days_to_drop"], -len(f["barrier_types"])) for f in flags]
    assert keys == sorted(keys)


@pytest.mark.parametrize(
    ("query", "check"),
    [
        ("barrier=failed_payment", lambda f: "failed_payment" in f["barrier_types"]),
        ("urgency=urgent", lambda f: f["days_to_drop"] < 7),
        ("urgency=soon", lambda f: 7 <= f["days_to_drop"] <= 14),
        ("urgency=later", lambda f: f["days_to_drop"] > 14),
        ("status=new", lambda f: f["status"] == "new"),
        ("program=BS+Psychology", lambda f: f["program"] == "BS Psychology"),
    ],
)
async def test_queue_filters(
    client: httpx.AsyncClient, run: dict[str, Any], query: str, check: Any
) -> None:
    response = await client.get(f"/api/v1/runs/{run['id']}/flags?{query}")
    assert response.status_code == 200
    assert all(check(f) for f in response.json())


async def test_unknown_filter_value_is_rejected(
    client: httpx.AsyncClient, run: dict[str, Any]
) -> None:
    response = await client.get(f"/api/v1/runs/{run['id']}/flags?barrier=nope")
    assert response.status_code == 422


async def test_detail_shows_explanation_sources_and_draft(
    client: httpx.AsyncClient, run: dict[str, Any]
) -> None:
    flag = await _first_flag(client, run["id"])
    assert flag["explanation"]
    assert "drop_date" in flag["source_fields"]
    assert flag["draft_message"] == flag["original_draft"]
    assert flag["draft_source"] == "template"
    assert flag["actions"] == []


async def test_approve_without_edits(client: httpx.AsyncClient, run: dict[str, Any]) -> None:
    flag = await _first_flag(client, run["id"])
    response = await _act(client, flag, action="approve")
    body = response.json()
    assert body["status"] == "approved"
    assert body["version"] == flag["version"] + 1
    assert body["actions"][0]["coach"] == "Coach Kim"


async def test_approve_with_edit_logs_before_and_after(
    client: httpx.AsyncClient, run: dict[str, Any]
) -> None:
    flag = await _first_flag(client, run["id"])
    edited = flag["draft_message"] + " See you soon."
    body = (await _act(client, flag, action="approve", message=edited)).json()
    assert body["status"] == "edited"
    [log] = body["actions"]
    assert log["before_text"] == flag["draft_message"]
    assert log["after_text"] == edited


async def test_stale_version_conflicts(client: httpx.AsyncClient, run: dict[str, Any]) -> None:
    flag = await _first_flag(client, run["id"])
    await _act(client, flag, action="approve")
    response = await _act(client, flag, action="dismiss", reason="duplicate")
    assert response.status_code == 409
    assert response.headers["content-type"] == "application/problem+json"


async def test_dismiss_requires_reason(client: httpx.AsyncClient, run: dict[str, Any]) -> None:
    flag = await _first_flag(client, run["id"])
    assert (await _act(client, flag, action="dismiss", reason="")).status_code == 422
    assert (await _act(client, flag, action="dismiss", reason="  ")).status_code == 422
    ok = await _act(client, flag, action="dismiss", reason="Already paid by phone")
    assert ok.json()["dismiss_reason"] == "Already paid by phone"


async def test_route_then_undo_with_reopen(client: httpx.AsyncClient, run: dict[str, Any]) -> None:
    flag = await _first_flag(client, run["id"])
    routed = (await _act(client, flag, action="route", route_to="bursar")).json()
    assert (routed["status"], routed["routed_to"]) == ("routed", "bursar")

    again = await _act(client, routed, action="approve")
    assert again.status_code == 422

    reopened = (await _act(client, routed, action="reopen")).json()
    assert (reopened["status"], reopened["routed_to"]) == ("new", None)
    assert [a["action"] for a in reopened["actions"]] == ["route", "reopen"]


async def test_cannot_route_to_coach(client: httpx.AsyncClient, run: dict[str, Any]) -> None:
    flag = await _first_flag(client, run["id"])
    assert (await _act(client, flag, action="route", route_to="coach")).status_code == 422


async def test_reopen_requires_a_decision(client: httpx.AsyncClient, run: dict[str, Any]) -> None:
    flag = await _first_flag(client, run["id"])
    assert (await _act(client, flag, action="reopen")).status_code == 422


async def test_approve_rejects_empty_or_long_message(
    client: httpx.AsyncClient, run: dict[str, Any]
) -> None:
    flag = await _first_flag(client, run["id"])
    assert (await _act(client, flag, action="approve", message=" ")).status_code == 422
    long = "word " * 130
    assert (await _act(client, flag, action="approve", message=long)).status_code == 422


async def test_redraft_in_spanish(client: httpx.AsyncClient, run: dict[str, Any]) -> None:
    flag = await _first_flag(client, run["id"])
    body = (await _act(client, flag, action="redraft", language="es", tone="brief")).json()
    assert body["draft_language"] == "es"
    assert body["draft_message"].startswith("Hola")
    assert body["status"] == "new"


async def test_summary_counters(client: httpx.AsyncClient, run: dict[str, Any]) -> None:
    flag = await _first_flag(client, run["id"])
    await _act(client, flag, action="approve")
    summary = (await client.get(f"/api/v1/runs/{run['id']}/summary")).json()
    counters = summary["counters"]
    assert counters["flagged"] == 25
    assert counters["approved"] == 1
    assert counters["pending"] == 24
    assert counters["routed"] == counters["dismissed"] == 0
    assert counters["most_urgent_days_to_drop"] is not None
    assert sum(summary["by_barrier"].values()) >= 25
    assert summary["programs"]


async def test_latest_run(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/v1/runs/latest")).status_code == 404
    await _upload(client, generate(20, as_of=AS_OF).to_csv().encode())
    assert (await client.get("/api/v1/runs/latest")).status_code == 200


async def test_run_without_flags_is_ready_immediately(client: httpx.AsyncClient) -> None:
    healthy = "\n".join(generate(5, as_of=AS_OF, flag_rate=0).to_csv().splitlines()[:2])
    body = (await _upload(client, healthy.encode())).json()
    assert (body["status"], body["flagged_count"]) == ("ready", 0)


async def test_invalid_csv_returns_problem_details(client: httpx.AsyncClient) -> None:
    response = await _upload(client, b"student_id,first_name\nS1,Ana\n")
    assert response.status_code == 422
    body = response.json()
    assert body["title"] == "The file needs a few fixes"
    assert "Missing required columns" in body["errors"][0]


async def test_oversized_upload_is_rejected(client: httpx.AsyncClient) -> None:
    response = await _upload(client, b"x" * (2 * 1024 * 1024 + 1))
    assert response.status_code == 422
    assert "larger than" in response.json()["detail"]


async def test_unknown_ids_return_404(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/v1/runs/nope")).status_code == 404
    assert (await client.get("/api/v1/flags/nope")).status_code == 404
    response = await client.post(
        "/api/v1/flags/nope/actions", json={"action": "reopen", "coach": "K", "version": 1}
    )
    assert response.status_code == 404


async def test_meta_and_sample_data(client: httpx.AsyncClient) -> None:
    meta = (await client.get("/api/v1/meta")).json()
    assert meta["required_columns"][0] == "student_id"
    assert len(meta["barriers"]) == 6
    assert "$1,000" in meta["barriers"][0]["description"]
    sample = await client.get("/api/v1/sample-data.csv?rows=10")
    assert sample.headers["content-type"].startswith("text/csv")
    assert len(sample.text.strip().splitlines()) == 11


async def test_ops_endpoints_and_headers(client: httpx.AsyncClient) -> None:
    health = await client.get("/healthz", headers={"X-Request-ID": "abc123"})
    assert health.json() == {"status": "ok", "release": "dev"}
    assert health.headers["X-Request-ID"] == "abc123"
    assert health.headers["X-Content-Type-Options"] == "nosniff"
    ready = (await client.get("/readyz")).json()
    assert ready == {"status": "ready", "database": "up", "drafter": "template"}
    metrics = (await client.get("/metrics")).text
    assert "my_path_http_requests_total" in metrics
    assert 'route="/healthz"' in metrics
