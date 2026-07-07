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

- Use Vercel for Go backend: Pending
- Use separate Go hosting platform: Pending
