# Runbook

Start every investigation with the **My Path overview** dashboard in Grafana and the API logs.
Logs are JSON; filter by `request_id` (users see it as the `X-Request-ID` response header).

```bash
kubectl -n my-path logs deploy/my-path-api --since=15m | jq 'select(.level=="ERROR")'
kubectl -n my-path get pods,hpa,pdb
kubectl -n my-path rollout history deploy/my-path-api
```

## API down

1. `kubectl -n my-path get pods -l app.kubernetes.io/name=my-path-api`: are pods crash-looping?
2. `kubectl -n my-path describe pod <pod>`: look for OOMKilled, image pull errors or failed probes.
3. If a deploy just went out, **roll back first, debug second**:
   `kubectl -n my-path rollout undo deploy/my-path-api`.
4. If `/readyz` fails with `database: down`, go to [Database unavailable](#database-unavailable).

## High error rate

1. Dashboard → "5xx by route" to find the failing route.
2. Search logs for `"level":"ERROR"` with that route and group by `event`.
3. A recent deploy? Roll back (see above). A dependency? Check the database and LLM sections.
4. After mitigation, open an incident record ([incident response](incident-response.md)).

## Slow responses

1. Check CPU and HPA: `kubectl -n my-path get hpa`. At max replicas? Raise `maxReplicas`.
2. Check database latency and connections. List endpoints scan one run and are indexed by
   `(run_id, days_to_drop)`; unusually large runs (over 5,000 rows) are rejected at upload.

## AI drafts falling back

Fallbacks are safe (coaches get a template), but quality drops.

1. Logs: `event == "draft_fallback"`. The `reason` field says why: API error, stop reason
   (for example a refusal), schema failure or a guardrail violation.
2. API errors or timeouts: check the LLM provider status and rate limits; lower
   `MY_PATH_LLM_MAX_CONCURRENCY`.
3. Guardrail violations: a prompt or model change is producing longer or harder text. Revert the
   change, or temporarily set `MY_PATH_DRAFTER=template`.

## Run stuck in processing

1. `my_path_runs_in_progress` stays above 0. Look for `run_drafting_failed` in the logs.
2. Restarting an API pod resumes unfinished runs automatically (`resume_incomplete_runs`):
   `kubectl -n my-path rollout restart deploy/my-path-api`.

## Database unavailable

1. `/readyz` returns 503, so pods leave the load balancer (liveness stays green by design, to avoid
   restart storms).
2. Check the managed PostgreSQL console for failover, storage or connection limits.
3. Once the database is back, readiness recovers on its own. No restart is needed.

## Deploy and rollback

- **Build once, promote the same digest.** Release builds, scans and signs the API image on
  `main`, deploys that digest to **staging** and smoke-tests it. A `vX.Y.Z` tag plus approval
  deploys the **same digest** to **production** after `cosign verify`. See
  [docs/deploy/render.md](../deploy/render.md).
- **What is live?** `curl https://my-path-api.onrender.com/healthz` reports the commit.
- **Rollback:** re-run **Deploy to production** from the previous tag's Release run. It redeploys
  that digest and moves `release` (the production web build) back.
- **Migrations** run on API start and must be backward compatible for one release
  (expand, then contract), so a rollback never meets a schema it can't read.
- The Kubernetes manifests in `deploy/k8s` stay valid (CI checks them) for teams that move to a
  cluster. They are not part of the Render pipeline.
