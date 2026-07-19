# Web Backend Deployment

## Desktop Mode

- Set or allow `RUNTIME_MODE=desktop`.
- `DB_TYPE=sqlite` is supported and remains the default.
- `DB_PATH` defaults to the user's local config directory.
- This mode is suitable for Wails desktop builds and local-only data.

## Web Production Mode

- Set `RUNTIME_MODE=server`.
- Set `ENV=production`.
- Use `DB_TYPE=postgres` or `DB_TYPE=mysql`.
- Set `DB_AUTO_CREATE=false` for managed database providers.
- Set `DB_SSL_MODE=require` for hosted PostgreSQL unless the provider documents a different value.
- Set a strong persistent `JWT_SECRET`; generated runtime secrets invalidate all existing tokens on restart.
- Do not use SQLite for the hosted web backend.

The server configuration rejects `ENV=production`, `RUNTIME_MODE=server`, and `DB_TYPE=sqlite` unless `ALLOW_PRODUCTION_SQLITE=true` is explicitly set. That override is intended only for deliberate exceptions, not normal web production.

## Required Environment Variables

- `ENV=production`
- `RUNTIME_MODE=server`
- `JWT_SECRET`
- `DB_TYPE`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL_MODE`
- `DB_AUTO_CREATE=false`
- `ALLOWED_ORIGINS`
- `FRONTEND_URL`
- `API_BASE_URL`

## Local Server Smoke Test

```bash
API_SERVER_HOST=127.0.0.1 \
API_SERVER_PORT=3457 \
DB_PATH=/tmp/orange-smoke.db \
JWT_SECRET=orange-dev-secret-32-characters-long \
task server:dev
```

Then verify:

```bash
curl http://127.0.0.1:3457/api/health
```

## Backend Host Decision

- Selected host: container/server platform for the Go API, such as Fly.io, Railway, Render, Cloud Run, or any Docker-capable VPS/PaaS.
- Reason: Orange's backend is a Gin service with shared startup, migrations, seed data, JWT setup, and database pooling. That model is simpler and safer as a long-running Go API than as many serverless function invocations. The Vercel Go POC remains useful for a narrow health endpoint but has not yet passed full local/preview validation.
- Deployment artifact: `Dockerfile` builds `./cmd/server` into the `orange-api` container using Go 1.26.
- Deployment command:

```bash
docker build -t orange-api:local .
```

- Required runtime environment:
  - `ENV=production`
  - `RUNTIME_MODE=server`
  - `API_SERVER_HOST=0.0.0.0`
  - `API_SERVER_PORT=3456`
  - `JWT_SECRET`
  - `DB_TYPE=postgres` or `DB_TYPE=mysql`
  - `DB_HOST`
  - `DB_PORT`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`
  - `DB_SSL_MODE`
  - `DB_AUTO_CREATE=false`
  - `ALLOWED_ORIGINS`
  - `FRONTEND_URL`

## Container Smoke Test

Current local verification status:

- `docker build -t orange-api:local .`: Passed after Docker Desktop was started.
- Container health check passed with `docker run ... orange-api:local` and `curl http://127.0.0.1:3459/api/health`.
- Source-level API verification passed with `go run ./cmd/server` and `curl http://127.0.0.1:3457/api/health`.

For local container smoke testing only, SQLite can be enabled explicitly:

```bash
docker run --rm -p 3456:3456 \
  -e ENV=production \
  -e RUNTIME_MODE=server \
  -e JWT_SECRET=replace-with-a-strong-dev-secret-32-characters \
  -e DB_TYPE=sqlite \
  -e ALLOW_PRODUCTION_SQLITE=true \
  orange-api:local
```

Then verify:

```bash
curl http://127.0.0.1:3456/api/health
```

## Rollback Plan

- Keep the previous container image tag available.
- Roll back the API service to the previous image if health checks or login smoke tests fail.
- Roll back the Vercel frontend deployment to the previous deployment if the frontend cannot reach the API.
- Restore the production database backup if a migration introduces data issues.
