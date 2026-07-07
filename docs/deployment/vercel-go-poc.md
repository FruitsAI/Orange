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

- Status: Partial
- Preview URL:
- Notes:
  - The first POC endpoint intentionally avoids config, database, Gin, and migrations. It only proves a minimal Go function can be built and routed by Vercel.
  - `go test ./api ./...` passes locally.
  - `npx --yes vercel dev --listen 127.0.0.1:3002 --yes` created/retrieved a local Vercel project and reached `Ready`, but the local Vercel Go runtime failed before serving `/api/health`.
  - Local Vercel failure signature: `.vercel/cache/golang/src/... package <stdlib> is not in std` followed by `Standalone Go dev server exited before startup completed`.
  - This should be rechecked in a clean Vercel preview environment before deciding whether to expand the full Gin API into Vercel functions.

## Decision

- Use Vercel for Go backend: No for the primary production API at this stage.
- Use separate Go hosting platform: Yes.
- Selected path: deploy the standalone `cmd/server` API as a container/server process and keep Vercel focused on the static React frontend.

## Rationale

- The full backend initializes config, logger, JWT, database connections, migrations, seed data, middleware, and the Gin router as one service.
- Hosted web production should use PostgreSQL/MySQL connection pooling and predictable process lifetime.
- The local Vercel Go POC did not serve successfully under `vercel dev` because the local Go runtime cache failed before startup.
- Vercel can still host the static React app and the narrow `/api/health` POC can stay as a future experiment.

Revisit Vercel for the Go backend only after a clean preview deployment proves a full router adapter can initialize safely, connect to hosted DB, and meet cold-start/timeout requirements.
