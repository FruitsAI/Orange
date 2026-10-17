# Vercel Go Backend POC

## Goal

Verify whether the Orange Go backend can run on Vercel without forcing a backend rewrite.

## Checks

- `GET /api/health` works.
- Gin router can be adapted or mounted.
- Environment variables load correctly.
- Hosted database connection works.
- Cold start is acceptable.

## Result

- Status: Failed for the current production architecture.
- Preview URL: none for the Go backend POC.
- Notes:
  - The first POC endpoint intentionally avoids config, database, Gin, and migrations. It only proves a minimal Go function can be built and routed by Vercel.
  - `go test ./api ./...` passes locally.
  - `npx --yes vercel dev --listen 127.0.0.1:3002 --yes` created/retrieved a local Vercel project and reached `Ready`, but the local Vercel Go runtime failed before serving `/api/health`.
  - Local Vercel failure signature: `.vercel/cache/golang/src/... package <stdlib> is not in std` followed by `Standalone Go dev server exited before startup completed`.
  - A later frontend preview attempt also failed because Vercel detected the repository root `go.mod` as a Go project and expected a compiled Go function binary after running the React frontend build command.
  - The POC code has been moved to `docs/deployment/examples/vercel-health.go.example` so the Vercel project can be used for frontend-only deployments.
  - The full Gin API should not be expanded into Vercel functions in this migration.

## Decision

- Use Vercel for Go backend: No for this migration.
- Use separate Go hosting platform: Yes.
- Selected path: deploy the standalone `cmd/server` API as a container/server process and keep Vercel focused on the static React frontend.

## Rationale

- The full backend initializes config, logger, JWT, database connections, migrations, seed data, middleware, and the Gin router as one service.
- Hosted web production should use PostgreSQL/MySQL connection pooling and predictable process lifetime.
- The local Vercel Go POC did not serve successfully under `vercel dev` because the local Go runtime cache failed before startup.
- Vercel should host only the static React app in the active deployment path. The narrow `/api/health` POC remains archived as a future reference.

Reopen Vercel for the Go backend only as a separate architecture decision after a clean preview deployment proves a full router adapter can initialize safely, connect to hosted DB, and meet cold-start/timeout requirements without breaking frontend deployment.
