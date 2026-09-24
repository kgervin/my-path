#!/usr/bin/env python3
"""Post-deploy smoke test for My Path. Standard library only, so CI needs no installs.

  python scripts/smoke_test.py --api URL [--web URL] [--expect-release SHA] [--write]

1. Waits until the API reports the expected release (covers cold starts and slow deploys).
2. Checks readiness (database up).
3. With --web: checks the SPA, a client route (refresh fallback) and the /api proxy.
4. With --write (staging only): uploads the sample CSV, waits for drafts, approves one
   student, then undoes it. Never use --write against production.
Exits non-zero on the first failure, with a message saying what broke.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
import uuid
from typing import Any

TIMEOUT_S = 90  # per request; free instances can take ~60 s to wake
HTTP_OK, HTTP_ACCEPTED = 200, 202
BARRIER_COUNT = 6
ACTIONS_AFTER_UNDO = 2  # approve + reopen


def request(
    method: str, url: str, body: bytes | None = None, headers: dict[str, str] | None = None
) -> tuple[int, bytes, str]:
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})  # noqa: S310 - URLs come from CI config
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:  # noqa: S310
            return resp.status, resp.read(), resp.headers.get("Content-Type", "")
    except urllib.error.HTTPError as err:
        return err.code, err.read(), err.headers.get("Content-Type", "")


def get_json(url: str) -> Any:
    status, body, _ = request("GET", url)
    check(status == HTTP_OK, f"GET {url} returned {status}: {body[:200]!r}")
    return json.loads(body)


def post_json(url: str, payload: dict[str, Any]) -> Any:
    status, body, _ = request(
        "POST", url, json.dumps(payload).encode(), {"Content-Type": "application/json"}
    )
    check(status in (HTTP_OK, HTTP_ACCEPTED), f"POST {url} returned {status}: {body[:300]!r}")
    return json.loads(body)


def check(condition: bool, message: str) -> None:
    if not condition:
        print(f"FAIL: {message}", file=sys.stderr)
        sys.exit(1)


def wait_for_release(api: str, expected: str | None, deadline_s: int) -> None:
    start = time.monotonic()
    last = "no response"
    while time.monotonic() - start < deadline_s:
        try:
            health = get_json(f"{api}/healthz")
            last = health.get("release", "?")
            if expected is None or last == expected:
                print(f"ok   release {last} live after {time.monotonic() - start:.0f}s")
                return
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
            last = f"{type(err).__name__}: {getattr(err, 'reason', err)}"
        time.sleep(10)
    target = f"release {expected}" if expected else "healthy"
    check(False, f"API never became {target} within {deadline_s}s (last: {last})")


def check_web(web: str) -> None:
    for path in ("/", "/queue"):
        status, _body, ctype = request("GET", f"{web}{path}")
        check(status == HTTP_OK and "text/html" in ctype, f"web {path} returned {status} {ctype}")
    meta = get_json(f"{web}/api/v1/meta")
    check(
        len(meta.get("barriers", [])) == BARRIER_COUNT,
        "web /api proxy did not return the barrier catalog",
    )
    print("ok   web: SPA, client-route fallback and /api proxy")


def multipart(field: str, filename: str, content: bytes) -> tuple[bytes, str]:
    boundary = uuid.uuid4().hex
    body = (
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{field}"; filename="{filename}"\r\n'
            "Content-Type: text/csv\r\n\r\n"
        ).encode()
        + content
        + f"\r\n--{boundary}--\r\n".encode()
    )
    return body, f"multipart/form-data; boundary={boundary}"


def write_flow(base: str) -> None:
    status, csv_bytes, _ = request("GET", f"{base}/api/v1/sample-data.csv?rows=60&seed=99")
    check(status == HTTP_OK, f"sample CSV returned {status}")
    body, ctype = multipart("file", "smoke-test.csv", csv_bytes)
    status, raw, _ = request("POST", f"{base}/api/v1/runs", body, {"Content-Type": ctype})
    check(status == HTTP_ACCEPTED, f"upload returned {status}: {raw[:300]!r}")
    run = json.loads(raw)
    for _ in range(30):
        run = get_json(f"{base}/api/v1/runs/{run['id']}")
        if run["status"] != "processing":
            break
        time.sleep(2)
    check(run["status"] == "ready", f"run ended as {run['status']}")
    check(
        run["flagged_count"] > 0 and run["drafted_count"] == run["flagged_count"],
        f"drafts incomplete: {run}",
    )
    flags = get_json(f"{base}/api/v1/runs/{run['id']}/flags?status=new")
    flag = get_json(f"{base}/api/v1/flags/{flags[0]['id']}")
    approved = post_json(
        f"{base}/api/v1/flags/{flag['id']}/actions",
        {"action": "approve", "coach": "smoke-test", "version": flag["version"]},
    )
    check(approved["status"] == "approved", f"approve gave status {approved['status']}")
    reopened = post_json(
        f"{base}/api/v1/flags/{flag['id']}/actions",
        {"action": "reopen", "coach": "smoke-test", "version": approved["version"]},
    )
    check(
        reopened["status"] == "new" and len(reopened["actions"]) == ACTIONS_AFTER_UNDO,
        "undo (reopen) did not restore the student",
    )
    print(
        f"ok   write flow: {run['total_records']} uploaded, {run['flagged_count']} flagged "
        "and drafted, approve + undo"
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--api", required=True, help="API base URL, e.g. https://my-path-api.onrender.com"
    )
    parser.add_argument("--web", help="Web base URL; enables SPA and /api proxy checks")
    parser.add_argument("--expect-release", help="Wait until /healthz reports this release")
    parser.add_argument(
        "--write", action="store_true", help="Run the upload/approve/undo flow (staging only)"
    )
    parser.add_argument("--deadline", type=int, default=600, help="Seconds to wait for the release")
    args = parser.parse_args()
    api, web = args.api.rstrip("/"), (args.web or "").rstrip("/")

    wait_for_release(api, args.expect_release, args.deadline)
    ready = get_json(f"{api}/readyz")
    check(ready.get("database") == "up", f"readiness: {ready}")
    print("ok   ready, database up")
    if web:
        check_web(web)
    if args.write:
        write_flow(web or api)
    print("PASS")


if __name__ == "__main__":
    main()
