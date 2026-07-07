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

- Status: Deployed successfully with frontend project root.
- Production deployment URL: `https://frontend-g082ouaug-fruitsai.vercel.app`
- Production inspector URL: `https://vercel.com/fruitsai/frontend/GDv8taaQ9bnfkGzPNSBNBHsSRqLo`
- Preview deployment URL: `https://frontend-oawg1bk0k-fruitsai.vercel.app`
- Preview inspector URL: `https://vercel.com/fruitsai/frontend/7H5wqqx82xp6sjbxYMLS7ZbLXBau`
- Backend URL: Pending hosted Go API deployment and `VITE_API_BASE_URL` configuration.
- Smoke test:
  - Remote Vercel build: Passed.
  - `/login` direct load: Blocked by Vercel Deployment Protection; curl follows to `https://vercel.com/login?...`.
  - `/dashboard` refresh fallback: Blocked by Vercel Deployment Protection; curl follows to `https://vercel.com/login?...`.
  - Login against API: Pending backend URL/env.

To complete public route smoke tests, disable Deployment Protection for this project/environment or test through an authenticated Vercel session.
