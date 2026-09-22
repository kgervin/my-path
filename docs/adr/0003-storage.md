# 3. SQLAlchemy async with SQLite locally and PostgreSQL in clusters

- Status: accepted
- Date: 2026-09-22

## Context
The PRD asks for SQLite or in-memory storage for the hackday, but a pilot needs several API
replicas and durable storage.

## Decision
Use SQLAlchemy 2 async with a repository layer. `MY_PATH_DATABASE_URL` selects SQLite
(`aiosqlite`) or PostgreSQL (`asyncpg`). Schema changes go through Alembic; CI runs
`alembic check` so models and migrations cannot drift. Local and test environments create the
schema on startup; staging and production run a migration Job before rollout.

## Consequences
Zero-setup local development, and horizontal scaling in Kubernetes without code changes.
SQLite deployments must run a single replica.
