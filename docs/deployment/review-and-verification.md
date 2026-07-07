# React Web/Desktop Migration Review and Verification

Date: 2026-07-07

## Review Scope

- React + Vite frontend migration and removal of active Vue runtime paths.
- Shared Go bootstrap, standalone `cmd/server` API entrypoint, and Wails desktop shell.
- Vercel frontend-only deployment configuration rooted at `frontend`.
- Go backend deployment direction as a container/server process.
- Payment status compatibility for both `paid` and `confirmed`.

## Review Findings

### Fixed

- Desktop SPA deep links did not have an `index.html` fallback. `main.go` now serves real static files when present and falls back to the React app shell for routes such as `/dashboard`, while preserving `/api/*` routing to the backend. Regression tests were added in `main_test.go`.
- Vercel local build output under `frontend/.vercel/output` was scanned by `npm run lint` after a Vercel build. `frontend/eslint.config.ts` now ignores `**/.vercel/**`.
- Root Vercel deployment incorrectly mixed repository-root Go detection with frontend build commands. The root `vercel.json` was removed, `frontend/vercel.json` was added, and the Go POC handler was archived under `docs/deployment/examples/`.

### No Blocking Code Issues Found

- No active Vue, Vue Router, Pinia, or `.vue` source imports remain in `frontend/src`.
- The standalone Go API starts from `cmd/server` and responds to `/api/health`.
- Authenticated API smoke passed with a seeded admin account and `/api/v1/dashboard/stats`.
- Vercel frontend production and preview deployments reached `READY`.

## Verification Evidence

- `go vet ./... && go test ./...`: Passed. macOS linker emitted version warnings only.
- `cd frontend && npm run lint && npm run build`: Passed. Vite emitted a chunk-size warning only.
- `task build`: Passed. Wails binding generation emitted Go 1.26 vs Go 1.25 analysis warnings; npm emitted engine/allow-scripts warnings.
- `npx --yes vercel build --cwd frontend --yes`: Passed.
- `go run ./cmd/server` with temporary SQLite DB plus `curl /api/health`: Passed.
- `go run ./cmd/server` plus admin login and `/api/v1/dashboard/stats`: Passed.
- `docker build -t orange-api:local .`: Blocked because local Docker daemon is not running.
- Vercel route smoke for `/login` and `/dashboard`: Blocked by Vercel Deployment Protection redirecting to Vercel login.

## Residual Risks

- React settings and business pages are functional but not a full pixel/feature parity audit against the deleted Vue screens.
- The main frontend bundle is larger than Vite's 500 KB warning threshold; this is not a build failure but should be revisited with route-level code splitting.
- Production web login cannot be fully verified until a hosted Go API URL is deployed and configured as `VITE_API_BASE_URL`.
- Docker image build still needs to be verified on a machine with Docker daemon running.
