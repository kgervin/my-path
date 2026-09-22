# One entry point for humans and CI. `make help` lists targets.
.DEFAULT_GOAL := help
.PHONY: help install dev api web check test e2e lint format build up down data

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Install backend and frontend dependencies
	cd backend && uv sync
	cd frontend && npm ci

api: ## Run the API with reload on :8000
	cd backend && uv run uvicorn my_path.main:create_app --factory --reload --port 8000

web: ## Run the web app with HMR on :5173 (proxies /api to :8000)
	cd frontend && npm run dev

lint: ## Lint and type-check everything
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy src tests
	cd frontend && npm run -s lint && npm run -s format:check && npm run -s typecheck

format: ## Auto-format everything
	cd backend && uv run ruff format . && uv run ruff check --fix .
	cd frontend && npm run -s format

test: ## Unit and integration tests with coverage gates
	cd backend && uv run pytest
	cd frontend && npm test

e2e: ## Playwright end-to-end + axe (starts both servers)
	cd frontend && npm run e2e

check: lint test ## Everything CI runs before e2e

build: ## Build container images
	docker compose build

up: ## Run the production-like stack on :8080
	docker compose up --build

down: ## Stop the stack
	docker compose down

data: ## Write 200 synthetic students to backend/synthetic_students.csv
	cd backend && uv run my-path-generate-data --rows 200 --out synthetic_students.csv
