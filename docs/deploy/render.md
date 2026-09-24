# Deploying on Render (free) with Neon

Everything runs on free tiers with no credit card:

| Part | Where | Notes |
| --- | --- | --- |
| API | Render web service (Docker, free) | Built from `backend/Dockerfile`. Sleeps after 15 min idle; the first request after that takes ~30–60 s. |
| Frontend | Render static site (free) | Built from `frontend/`. Proxies `/api/*` to the API, so there is no CORS setup. |
| Database | Neon Postgres (free) | Permanent free plan: 0.5 GB, 100 compute-hours/month. |

The whole setup is described in [`render.yaml`](../../render.yaml) (a Render Blueprint). CI
validates it against Render's schema on every pull request.

## 1. Create the database (Neon)

1. Sign up at [neon.tech](https://neon.tech) and create a project in **US East (Ohio)**
   (`us-east-2`), the same region as the API (`ohio` in `render.yaml`).
2. Click **Connect**, turn connection pooling **off**, and copy the connection string. The host
   must not contain `-pooler`: Neon's pooler (PgBouncer, transaction mode) breaks asyncpg's
   prepared statements.
3. Change it to the API's format:
   - start: `postgresql://` → `postgresql+asyncpg://`
   - end: replace everything after `?` with `ssl=require`

   Result: `postgresql+asyncpg://USER:PASSWORD@HOST/DB?ssl=require`.
   On macOS, with the Neon string copied, this converts it in place on the clipboard without
   printing the password:
   `pbpaste | sed -E 's#^postgres(ql)?://#postgresql+asyncpg://#; s#\?.*$#?ssl=require#' | pbcopy`

## 2. Deploy the Blueprint (Render)

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New → Blueprint**, pick `kgervin/my-path`, branch `main`. Leave **Blueprint path** as
   `render.yaml`. (Pointing it at a Dockerfile gives
   `cannot unmarshal !!str 'FROM py…' into file.Spec`.)
3. Render asks for `MY_PATH_DATABASE_URL`: paste the converted string from step 1.
4. Click **Deploy Blueprint**. The API runs `alembic upgrade head` on start, then goes live when
   `/readyz` reports the database is up.

## 3. Check it

- `https://my-path-api.onrender.com/readyz` returns `{"status":"ready","database":"up",...}`.
- Open the `my-path-web` URL, click **Download a sample CSV**, upload it, and review a student.

If Render named the API differently (for example `my-path-api-abcd.onrender.com` because the
name was taken), update the `/api/*` destination in `render.yaml` to that URL and push.

## Everyday use

- Deploys run automatically after CI passes on `main` (`autoDeployTrigger: checksPass`).
- Logs: Render dashboard → service → **Logs** (JSON; filter by `request_id`).
- To draft with Claude, add `MY_PATH_DRAFTER=anthropic` and `ANTHROPIC_API_KEY` on the API
  service.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Deploy fails at `alembic upgrade head` | `MY_PATH_DATABASE_URL` is wrong: needs `postgresql+asyncpg://` and `?ssl=require` (not `sslmode`). |
| Intermittent `prepared statement ... does not exist` | The URL uses Neon's pooled host (`-pooler`). Use the direct host. |
| Health check fails on `/readyz` | Neon compute is suspended or the URL is wrong. Open the Neon console; it wakes on connect. |
| UI shows "Connection problem" | The API is waking from sleep (wait a minute) or the `/api/*` rewrite points at the wrong URL. |
| First load is slow | Expected on the free plan after 15 minutes idle. |
