# Vercel Frontend Deployment

## Project Settings

- Framework Preset: Vite
- Root Directory: repository root
- Install Command: `cd frontend && npm ci`
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`

## Environment Variables

- `VITE_API_BASE_URL=https://api.example.com`

Use the deployed Go API base URL. Leave this unset only for same-origin desktop or local proxy use.

## SPA Routing

All non-API routes rewrite to `/index.html`, so direct visits to `/login`, `/dashboard`, `/projects/:id`, and other React Router routes return the app shell.

The current `vercel.json` preserves the `/api/health` Go function POC. Do not expand Vercel Go backend routes until the backend decision gate is rechecked in a preview deployment.

## Preview Result

- Status: Pending user/project credentials
- Preview URL:
- Backend URL:
- Smoke test:
  - `/login` direct load: Pending
  - `/dashboard` refresh fallback: Pending
  - Login against API: Pending
