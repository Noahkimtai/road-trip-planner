.PHONY: test test-backend test-frontend up down build

# ── Infrastructure ────────────────────────────────────────────────────────────

up:
	docker compose up -d db redis

down:
	docker compose --profile tests --profile backend --profile frontend down

build:
	docker compose --profile tests build

# ── Test targets ──────────────────────────────────────────────────────────────

## Run both backend (pytest) and frontend (vitest) test suites
test: up
	docker compose --profile tests run --rm backend-tests
	docker compose --profile tests run --rm frontend-tests

## Run only the backend pytest suite
test-backend: up
	docker compose --profile tests run --rm backend-tests

## Run only the frontend vitest suite
test-frontend:
	docker compose --profile tests run --rm frontend-tests
