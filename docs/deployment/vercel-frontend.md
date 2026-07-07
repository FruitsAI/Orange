# Vercel Frontend Deployment

## Project Settings

- Framework Preset: Vite
- Root Directory: `frontend`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`

## Environment Variables

- `VITE_API_BASE_URL=https://api.example.com`

Use the deployed Go API base URL. Leave this unset only for same-origin desktop or local proxy use.

## SPA Routing

All routes rewrite to `/index.html` through `frontend/vercel.json`, so direct visits to `/login`, `/dashboard`, `/projects/:id`, and other React Router routes return the app shell.

The Vercel frontend project must use `frontend` as its root directory. Deploying the repository root makes Vercel detect `go.mod` as a Go project and fail with `No compiled Go binary found after buildCommand`.

For CLI deploys from the repository root, use:

```bash
vercel deploy --cwd frontend
```

The earlier `/api/health` Go function POC is archived in `docs/deployment/examples/vercel-health.go.example` because active Go functions in the root Vercel project caused the frontend deployment build to expect a compiled Go function binary.

## Preview Result

- Status: Previous root deploy failed because Vercel detected the Go project; retry with `--cwd frontend` or project Root Directory `frontend`.
- Preview URL: `https://react-web-desktop-go-deployment-chuk2na7q-fruitsai.vercel.app` (failed deployment)
- Backend URL:
- Smoke test:
  - `/login` direct load: Pending retry
  - `/dashboard` refresh fallback: Pending retry
  - Login against API: Pending backend URL/env
