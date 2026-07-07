# Migration Baseline

Date: 2026-07-07

## Backend

- Command: `go test ./...`
- Initial result: FAIL in root package because `main.go` embeds `all:frontend/dist` and the isolated worktree did not have `frontend/dist` yet.
- Remediation: Ran `cd frontend && npm install && npm run build` to generate `frontend/dist`.
- Re-run command: `go test ./...`
- Re-run result: PASS.
- Notes:
  - The Go tool reported macOS linker warnings about objects built for macOS 26.0 while linking against macOS 11.0.
  - `go test ./...` also discovered `frontend/node_modules/flatted/golang/pkg/flatted` after `npm install`. It passed, but this is a baseline quirk to keep in mind for future CI commands.

## Frontend

- Command: `cd frontend && npm install && npm run build`
- Result: PASS.
- Notes:
  - `npm install` completed with 0 vulnerabilities.
  - npm emitted `allow-scripts` warnings for `esbuild` and `fsevents`; the build still completed successfully.
  - Current build still uses Vue tooling: `vue-tsc --build && vite build --mode production && node scripts/cleanup-remixicon-assets.mjs`.

## Current Runtime

- Desktop entrypoint: `main.go`
- Frontend framework: Vue 3 + Vite
- Router: Vue Router
- Store: Pinia
- API prefix: `/api/v1`
- Wails asset embedding requires `frontend/dist` to exist before root package tests/builds.

