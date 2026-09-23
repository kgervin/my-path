# Deploying the API on Fly.io

The API runs on Fly.io from `backend/` (config: [`backend/fly.toml`](../../backend/fly.toml)).
The frontend is on Vercel (`docs/deploy/vercel.md`). Data lives in PostgreSQL. SQLite on a Fly
volume does not work, because Fly mounts volumes as `root` and the image runs as a non-root user.

## Why "Launch from GitHub" failed

Fly looks for a `Dockerfile` or `fly.toml` at the **top of the repo**. My Path keeps the API in
`backend/`, so there was nothing to build. Either launch with the CLI from `backend/` (below), or
in the Fly dashboard set the **working directory** to `backend`.

## First deploy (CLI)

```bash
brew install flyctl && fly auth login
cd backend
fly launch --copy-config --no-deploy        # creates app my-path-api-kgervin from fly.toml
```

Create a database and give the app its URL. Any PostgreSQL works. For example, a free
[Neon](https://neon.tech) database or Fly Managed Postgres (`fly mpg create`). The API uses
asyncpg, so the scheme is `postgresql+asyncpg://` and TLS is `ssl=require` (not `sslmode`):

```bash
fly secrets set MY_PATH_DATABASE_URL='postgresql+asyncpg://USER:PASSWORD@HOST/DB?ssl=require'
fly deploy
```

`fly deploy` builds the image, runs `alembic upgrade head` as the release command, and starts the
machine only after `/readyz` passes. Check it:

```bash
curl https://my-path-api-kgervin.fly.dev/readyz   # {"status":"ready","database":"up",...}
```

Then set `VITE_API_BASE_URL=https://my-path-api-kgervin.fly.dev/api/v1` in Vercel and redeploy the
frontend.

## Optional settings

| Secret / env | Purpose |
| --- | --- |
| `MY_PATH_DRAFTER=anthropic` + `ANTHROPIC_API_KEY` (secret) | Draft with Claude instead of templates |
| `MY_PATH_CORS_ORIGINS`, `MY_PATH_CORS_ORIGIN_REGEX` | Already set in `fly.toml` for `kgervin-my-path` on Vercel; change if the Vercel project name differs |

Machines stop when idle (`auto_stop_machines`) and start on the next request. The first request
after a pause takes a few seconds. Set `min_machines_running = 1` in `fly.toml` to avoid that.

## Continuous deployment

The Release workflow can deploy to Fly after the API image passes its vulnerability scan:

```bash
fly tokens create deploy -a my-path-api-kgervin   # copy the token
gh secret set FLY_API_TOKEN -R kgervin/my-path --env fly
gh variable set FLY_DEPLOY_ENABLED -R kgervin/my-path --body true
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Release command fails with a connection error | `MY_PATH_DATABASE_URL` is missing or wrong (`fly secrets list`). Use `postgresql+asyncpg://` and `?ssl=require`. |
| Health check fails on `/readyz` | The database is unreachable from Fly. Check the provider's IP allow-list. |
| UI shows "Connection problem" | CORS: the Vercel URL must match `MY_PATH_CORS_ORIGINS` or `MY_PATH_CORS_ORIGIN_REGEX`. |
| Logs | `fly logs -a my-path-api-kgervin` (JSON; filter by `request_id`). |
