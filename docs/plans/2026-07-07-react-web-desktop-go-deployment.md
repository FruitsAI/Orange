# React Web/Desktop Go Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move Orange toward a shared React frontend that can run on Vercel and inside Wails, while splitting the Go backend into a deployable HTTP API without breaking the current desktop app.

**Architecture:** Use React + Vite as the default frontend target because Orange is an authenticated business application and the same SPA can be reused by Vercel static hosting and Wails. Extract the Go startup path so the desktop app and web API server share config, database, router, migrations, seed data, auth, and handlers. Treat Go-on-Vercel as an early proof-of-concept decision gate; if the Gin service does not fit Vercel's Go runtime constraints cleanly, deploy the Go API to a container/server platform and keep Vercel for the frontend.

**Tech Stack:** Go 1.25+, Gin, GORM, Wails v3, React, Vite, TypeScript, React Router, Zustand or React Context, Axios, Tailwind, Vercel, PostgreSQL/MySQL for hosted web, SQLite for desktop local mode.

---

## Decision Summary

Default frontend choice: **React + Vite**, not Next.js.

Reasons:
- The current app is an authenticated dashboard, not a public SEO/content site.
- The same React SPA can be built once and embedded in Wails or deployed as static assets on Vercel.
- Next.js Server Components and Server Actions add runtime concepts that do not help the Wails desktop target.
- Vercel works well for static Vite apps. The backend can remain a Go API with clear deployment options.

Reconsider Next.js only if one of these becomes a hard requirement:
- Public SEO pages or marketing pages live in the same app.
- The web product needs server-rendered personalized pages.
- The backend is intentionally moved from Go to Next.js route handlers/server actions.
- Web and desktop are allowed to diverge into separate frontend applications.

## Target Repository Shape

```text
/Users/willxue/will/FruitsAI/Orange/
  cmd/
    server/
      main.go                 # New standalone Go HTTP API entrypoint
  internal/
    app/
      bootstrap.go            # New shared runtime initialization
      bootstrap_test.go       # New tests for env/mode behavior
    router/
      router.go               # Existing Gin router, adjusted for hosted CORS/CSP
  frontend/
    package.json              # Migrated from Vue to React dependencies
    vite.config.ts            # React plugin, Wails plugin retained
    src/
      main.tsx                # New React entrypoint
      App.tsx                 # New root component
      router/
        routes.tsx            # New React Router config
      stores/
        auth.ts               # Pinia -> Zustand/Context
      api/
        index.ts              # Axios base URL supports Vercel and Wails
  vercel.json                 # Frontend deployment config, later backend PoC config if viable
  docs/
    plans/
      2026-07-07-react-web-desktop-go-deployment.md
```

## Deployment Model

### Web Production

```text
Browser
  -> Vercel static frontend (React + Vite)
  -> HTTPS API base URL
  -> Go API service
  -> Hosted PostgreSQL/MySQL
```

### Desktop Production

```text
Wails WebView
  -> embedded React dist
  -> same-origin /api through Wails asset handler
  -> local Go backend in the desktop process
  -> SQLite by default
```

### Backend Deployment Decision Gate

The plan explicitly tests whether the current Gin API can run on Vercel with acceptable limitations.

Pass criteria for Go on Vercel:
- `GET /api/health` works in a Vercel preview deployment.
- Authenticated routes can initialize config, JWT, DB, and router without module-scope side effects.
- Database connections work with hosted PostgreSQL/MySQL.
- Cold start and timeout behavior are acceptable for normal dashboard workflows.
- No requirement exists for long-lived background processes, local file persistence, or direct SQLite persistence in production web.

If any pass criterion fails, deploy the Go API to Fly.io, Railway, Render, Cloud Run, or another container/server platform. Keep frontend on Vercel.

## Phase 0: Baseline and Safety

### Task 1: Create a Migration Branch

**Files:**
- No code changes.

**Step 1: Verify status**

Run:

```bash
git status --short --branch
```

Expected: clean working tree, currently on the intended branch.

**Step 2: Create branch**

Run:

```bash
git switch -c codex/react-web-desktop-go-deployment
```

Expected: new branch checked out.

**Step 3: Commit checkpoint if this plan is not already committed**

Run:

```bash
git add docs/plans/2026-07-07-react-web-desktop-go-deployment.md
git commit -m "docs: plan react web desktop deployment"
```

Expected: documentation-only commit.

### Task 2: Capture Current Baseline

**Files:**
- Read: `frontend/package.json`
- Read: `frontend/vite.config.ts`
- Read: `frontend/src/main.ts`
- Read: `frontend/src/router/index.ts`
- Read: `main.go`
- Read: `internal/router/router.go`
- Read: `internal/config/config.go`
- Read: `Taskfile.yml`

**Step 1: Run backend tests**

Run:

```bash
go test ./...
```

Expected: PASS. If it fails, record failing packages before migration.

**Step 2: Run frontend build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS. If it fails, record current failures and decide whether they block migration.

**Step 3: Save baseline notes**

Create:
- `docs/migration-baseline.md`

Include:

```markdown
# Migration Baseline

Date: 2026-07-07

## Backend

- Command: `go test ./...`
- Result:

## Frontend

- Command: `cd frontend && npm run build`
- Result:

## Current Runtime

- Desktop entrypoint: `main.go`
- Frontend framework: Vue 3 + Vite
- Router: Vue Router
- Store: Pinia
- API prefix: `/api/v1`
```

**Step 4: Commit**

Run:

```bash
git add docs/migration-baseline.md
git commit -m "docs: capture migration baseline"
```

Expected: baseline commit.

## Phase 1: Split Go Runtime Initialization

### Task 3: Extract Shared Backend Bootstrap

**Files:**
- Create: `internal/app/bootstrap.go`
- Modify: `main.go`
- Test: `internal/app/bootstrap_test.go`

**Step 1: Write the failing test**

Create `internal/app/bootstrap_test.go`:

```go
package app

import "testing"

func TestRuntimeModeValues(t *testing.T) {
	if RuntimeModeDesktop != "desktop" {
		t.Fatalf("RuntimeModeDesktop = %q", RuntimeModeDesktop)
	}
	if RuntimeModeServer != "server" {
		t.Fatalf("RuntimeModeServer = %q", RuntimeModeServer)
	}
}
```

**Step 2: Run test to verify it fails**

Run:

```bash
go test ./internal/app -run TestRuntimeModeValues -v
```

Expected: FAIL because `internal/app` does not exist yet.

**Step 3: Add minimal bootstrap package**

Create `internal/app/bootstrap.go`:

```go
package app

import (
	"log/slog"
	"os"
	"runtime/debug"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/jwt"
	"github.com/FruitsAI/Orange/internal/pkg/logger"
	"github.com/FruitsAI/Orange/internal/router"
	"github.com/gin-gonic/gin"
)

type RuntimeMode string

const (
	RuntimeModeDesktop RuntimeMode = "desktop"
	RuntimeModeServer  RuntimeMode = "server"
)

type Runtime struct {
	Router *gin.Engine
}

func Bootstrap(mode RuntimeMode) (*Runtime, func(), error) {
	config.Load()
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	logger.Setup()
	cleanup := func() {
		if err := database.Close(); err != nil {
			slog.Warn("Failed to close database", "error", err)
		}
		logger.Sync()
	}

	defer func() {
		if r := recover(); r != nil {
			slog.Error("CRITICAL PANIC", "error", r, "stack", string(debug.Stack()))
			panic(r)
		}
	}()

	slog.Info("Application starting...", "version", "v"+constants.AppVersion, "mode", mode)

	jwt.SecretKey = []byte(config.AppConfig.JWTSecret)
	jwt.TokenExpiry = time.Duration(config.AppConfig.TokenExpiry) * time.Hour

	db := database.GetDB()
	if err := db.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.Payment{},
		&models.Dictionary{},
		&models.DictionaryItem{},
		&models.Notification{},
		&models.UserNotification{},
		&models.PersonalAccessToken{},
	); err != nil {
		cleanup()
		return nil, nil, err
	}

	if err := database.Seed(db); err != nil {
		slog.Error("Failed to seed database", "error", err)
	}

	return &Runtime{Router: router.NewRouter()}, cleanup, nil
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
go test ./internal/app -run TestRuntimeModeValues -v
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
git add internal/app/bootstrap.go internal/app/bootstrap_test.go
git commit -m "refactor: extract backend bootstrap"
```

Expected: commit succeeds.

### Task 4: Update Wails Entry to Use Shared Bootstrap

**Files:**
- Modify: `main.go`
- Test: `go test ./...`

**Step 1: Replace duplicated initialization**

In `main.go`:
- Keep embed asset handling.
- Keep `newExternalAPIServer`.
- Keep Wails window creation.
- Replace config/logger/JWT/database/router initialization with:

```go
runtime, cleanup, err := app.Bootstrap(app.RuntimeModeDesktop)
if err != nil {
	log.Fatal(err)
}
defer cleanup()
ginRouter := runtime.Router
```

Add import:

```go
github.com/FruitsAI/Orange/internal/app
```

Remove imports no longer needed by `main.go`:
- `log/slog`
- `os`
- `runtime/debug`
- `github.com/FruitsAI/Orange/internal/config`
- `github.com/FruitsAI/Orange/internal/constants`
- `github.com/FruitsAI/Orange/internal/database`
- `github.com/FruitsAI/Orange/internal/models`
- `github.com/FruitsAI/Orange/internal/pkg/jwt`
- `github.com/FruitsAI/Orange/internal/pkg/logger`
- `github.com/FruitsAI/Orange/internal/router`
- `github.com/gin-gonic/gin`

**Step 2: Format**

Run:

```bash
go fmt ./main.go ./internal/app
```

Expected: no output or formatted files.

**Step 3: Test**

Run:

```bash
go test ./...
```

Expected: PASS.

**Step 4: Commit**

Run:

```bash
git add main.go internal/app/bootstrap.go
git commit -m "refactor: share bootstrap with desktop entry"
```

Expected: commit succeeds.

### Task 5: Add Standalone Go API Server

**Files:**
- Create: `cmd/server/main.go`
- Modify: `Taskfile.yml`
- Test: `go test ./...`

**Step 1: Create server entrypoint**

Create `cmd/server/main.go`:

```go
package main

import (
	"context"
	"errors"
	"log"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/FruitsAI/Orange/internal/app"
	"github.com/FruitsAI/Orange/internal/config"
)

func main() {
	runtime, cleanup, err := app.Bootstrap(app.RuntimeModeServer)
	if err != nil {
		log.Fatal(err)
	}
	defer cleanup()

	host := os.Getenv("API_SERVER_HOST")
	if host == "" {
		host = "0.0.0.0"
	}

	addr := net.JoinHostPort(host, strconv.Itoa(config.AppConfig.APIServerPort))
	server := &http.Server{
		Addr:              addr,
		Handler:           runtime.Router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		slog.Info("Starting Orange API server", "addr", addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("API server failed: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("server shutdown failed: %v", err)
	}
}
```

**Step 2: Add Taskfile task**

Modify `Taskfile.yml`:

```yaml
  server:dev:
    summary: Runs the standalone Go API server
    cmds:
      - go run ./cmd/server
```

**Step 3: Test build**

Run:

```bash
go test ./...
go build ./cmd/server
```

Expected: both commands PASS.

**Step 4: Smoke test**

Run:

```bash
API_SERVER_PORT=3456 task server:dev
```

In another shell:

```bash
curl -s http://127.0.0.1:3456/api/health
```

Expected response contains:

```json
{"code":0,"message":"ok"}
```

Stop the server with `Ctrl-C`.

**Step 5: Commit**

Run:

```bash
git add cmd/server/main.go Taskfile.yml
git commit -m "feat: add standalone api server"
```

Expected: commit succeeds.

## Phase 2: Backend Web Deployment Readiness

### Task 6: Make CORS and CSP Web-Configurable

**Files:**
- Modify: `internal/config/config.go`
- Modify: `internal/router/router.go`
- Test: `internal/router/router_test.go`

**Step 1: Add config fields**

In `internal/config/config.go`, add:

```go
FrontendURL string
APIBaseURL  string
```

Load from:

```go
FrontendURL: getEnv("FRONTEND_URL", ""),
APIBaseURL:  getEnv("API_BASE_URL", ""),
```

**Step 2: Update default origins**

Append hosted frontend values only when configured:

```go
if frontendURL := getEnv("FRONTEND_URL", ""); frontendURL != "" {
	defaultAllowedOrigins = append(defaultAllowedOrigins, frontendURL)
}
```

**Step 3: Add router tests**

Add a test in `internal/router/router_test.go` that:
- Sets `ALLOWED_ORIGINS=https://orange.example.com`.
- Calls `config.Load()`.
- Builds `router.NewRouter()`.
- Sends an `OPTIONS /api/v1/auth/login` request with `Origin: https://orange.example.com`.
- Expects `204` and `Access-Control-Allow-Origin: https://orange.example.com`.

**Step 4: Run tests**

Run:

```bash
go test ./internal/router -run Cors -v
go test ./...
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
git add internal/config/config.go internal/router/router.go internal/router/router_test.go
git commit -m "feat: configure web cors origins"
```

Expected: commit succeeds.

### Task 7: Define Production Database Policy

**Files:**
- Create: `docs/deployment/web-backend.md`
- Modify: `internal/config/config.go`
- Test: `go test ./...`

**Step 1: Document database modes**

Create `docs/deployment/web-backend.md`:

```markdown
# Web Backend Deployment

## Desktop Mode

- `DB_TYPE=sqlite`
- `DB_PATH` defaults to the user's local config directory.
- Suitable for local desktop use only.

## Web Production Mode

- Use `DB_TYPE=postgres` or `DB_TYPE=mysql`.
- Set `DB_AUTO_CREATE=false`.
- Set `DB_SSL_MODE=require` for hosted Postgres unless provider says otherwise.
- Set a strong persistent `JWT_SECRET`.
- Do not use SQLite on serverless/web production.

## Required Environment Variables

- `ENV=production`
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
```

**Step 2: Prevent accidental hosted SQLite**

In `internal/config/config.go`, after `AppConfig` is assigned, add a production warning or fatal policy:

```go
if os.Getenv("ENV") == "production" && AppConfig.DBType == "sqlite" && os.Getenv("ALLOW_PRODUCTION_SQLITE") != "true" {
	log.Fatal("production web deployments must use mysql or postgres; set ALLOW_PRODUCTION_SQLITE=true only for desktop packaging")
}
```

If this blocks Wails production builds, refine it to use an explicit `RUNTIME_MODE=desktop|server` environment variable in bootstrap before enforcing.

**Step 3: Test**

Run:

```bash
go test ./...
```

Expected: PASS. If tests set `ENV=production`, isolate env variables with `t.Setenv`.

**Step 4: Commit**

Run:

```bash
git add docs/deployment/web-backend.md internal/config/config.go
git commit -m "docs: define web backend deployment policy"
```

Expected: commit succeeds.

### Task 8: Vercel Go Backend Proof of Concept

**Files:**
- Create: `api/health.go`
- Create: `vercel.json`
- Create: `docs/deployment/vercel-go-poc.md`
- Test: local Vercel dev or documented manual check

**Step 1: Create a minimal Vercel Go health endpoint**

Create `api/health.go`:

```go
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/FruitsAI/Orange/internal/constants"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"code":    0,
		"message": "ok",
		"data": map[string]any{
			"service": "Orange API POC",
			"version": constants.AppVersion,
		},
	})
}
```

**Step 2: Add Vercel config**

Create or update `vercel.json`:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/api/health",
      "destination": "/api/health.go"
    }
  ]
}
```

**Step 3: Document outcome**

Create `docs/deployment/vercel-go-poc.md`:

```markdown
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

- Status: Pending
- Preview URL:
- Notes:

## Decision

- Use Vercel for Go backend: Pending
- Use separate Go hosting platform: Pending
```

**Step 4: Local check**

Run:

```bash
npx vercel dev
```

Then:

```bash
curl -s http://127.0.0.1:3000/api/health
```

Expected: response contains `"Orange API POC"`.

**Step 5: Commit**

Run:

```bash
git add api/health.go vercel.json docs/deployment/vercel-go-poc.md
git commit -m "test: add vercel go backend poc"
```

Expected: commit succeeds.

**Step 6: Decision gate**

If Vercel Go runtime cannot mount the full Gin app safely, stop expanding backend-on-Vercel and use the standalone `cmd/server` deployment path instead.

## Phase 3: Frontend API Abstraction Before Framework Migration

### Task 9: Add Runtime API Base URL

**Files:**
- Create: `frontend/src/config/api.ts`
- Modify: `frontend/src/api/index.ts`
- Modify: `frontend/env.d.ts`
- Test: `cd frontend && npm run build`

**Step 1: Add API config**

Create `frontend/src/config/api.ts`:

```ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
```

Meaning:
- Empty string uses same-origin `/api`, which works in Wails.
- Vercel web sets `VITE_API_BASE_URL=https://api.example.com`.

**Step 2: Update Axios base URL**

In `frontend/src/api/index.ts`, set Axios base URL using:

```ts
import { API_BASE_URL } from '@/config/api'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
})
```

Keep existing interceptors and auth logout callback behavior.

**Step 3: Add env type**

In `frontend/env.d.ts`, add:

```ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}
```

**Step 4: Build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
git add frontend/src/config/api.ts frontend/src/api/index.ts frontend/env.d.ts
git commit -m "feat: configure frontend api base url"
```

Expected: commit succeeds.

## Phase 4: Migrate Vue Tooling to React Tooling

### Task 10: Replace Frontend Dependencies

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tsconfig.app.json`
- Modify: `frontend/eslint.config.ts`

**Step 1: Install React dependencies**

Run:

```bash
cd frontend
npm uninstall vue vue-router pinia @vitejs/plugin-vue vue-tsc vite-plugin-vue-devtools eslint-plugin-vue @vue/eslint-config-prettier @vue/eslint-config-typescript @vue/tsconfig
npm install react react-dom react-router-dom zustand
npm install -D @vitejs/plugin-react @types/react @types/react-dom eslint-plugin-react-hooks eslint-plugin-react-refresh
```

Expected: `package.json` and `package-lock.json` update.

**Step 2: Update scripts**

In `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build:dev": "tsc --build && vite build --minify false --mode development",
    "build": "tsc --build && vite build --mode production && node scripts/cleanup-remixicon-assets.mjs",
    "preview": "vite preview",
    "lint": "eslint . --fix --cache",
    "format": "prettier --write src/"
  }
}
```

**Step 3: Update Vite config**

In `frontend/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
```

Replace:

```ts
vue()
```

with:

```ts
react()
```

Remove `vite-plugin-vue-devtools`.

**Step 4: Update TypeScript JSX**

In `frontend/tsconfig.app.json`, ensure:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

**Step 5: Commit after build is temporarily allowed to fail**

At this point the source still contains `.vue` files. Do not require build success yet.

Run:

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/tsconfig.app.json frontend/eslint.config.ts
git commit -m "chore: switch frontend tooling to react"
```

Expected: commit succeeds.

## Phase 5: React App Shell

### Task 11: Create React Entry and Root App

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Delete later: `frontend/src/main.ts`
- Delete later: `frontend/src/App.vue`
- Create: `frontend/src/components/common/ToastContainer.tsx`

**Step 1: Create minimal Toast container placeholder**

Create `frontend/src/components/common/ToastContainer.tsx`:

```tsx
export default function ToastContainer() {
  return null
}
```

**Step 2: Create App component**

Create `frontend/src/App.tsx`:

```tsx
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import ToastContainer from '@/components/common/ToastContainer'

export default function App() {
  useEffect(() => {
    const updateLightPosition = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight

      document.body.style.setProperty('--light-x', x.toString())
      document.body.style.setProperty('--light-y', y.toString())
      document.body.style.setProperty('--specular-x', `${(0.5 - x) * 20}deg`)
      document.body.style.setProperty('--specular-y', `${(0.5 - y) * 20}deg`)
    }

    window.addEventListener('mousemove', updateLightPosition)
    return () => window.removeEventListener('mousemove', updateLightPosition)
  }, [])

  return (
    <>
      <Outlet />
      <ToastContainer />
    </>
  )
}
```

**Step 3: Create main entry**

Create `frontend/src/main.tsx`:

```tsx
import './assets/liquid-glass.css'
import './assets/main.css'
import 'remixicon/fonts/remixicon.css'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router/routes'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
```

**Step 4: Keep Vue files until routing exists**

Do not delete `frontend/src/main.ts` or `frontend/src/App.vue` until React router compiles.

**Step 5: Commit**

Run:

```bash
git add frontend/src/main.tsx frontend/src/App.tsx frontend/src/components/common/ToastContainer.tsx
git commit -m "feat: add react app shell"
```

Expected: commit succeeds.

### Task 12: Add React Router Skeleton

**Files:**
- Create: `frontend/src/router/routes.tsx`
- Create: `frontend/src/views/LoginView.tsx`
- Create: `frontend/src/views/DashboardView.tsx`
- Create: `frontend/src/components/layout/AppLayout.tsx`

**Step 1: Create placeholder views**

Create `frontend/src/views/LoginView.tsx`:

```tsx
export default function LoginView() {
  return <div>Login</div>
}
```

Create `frontend/src/views/DashboardView.tsx`:

```tsx
export default function DashboardView() {
  return <div>Dashboard</div>
}
```

**Step 2: Create layout placeholder**

Create `frontend/src/components/layout/AppLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom'

export default function AppLayout() {
  return <Outlet />
}
```

**Step 3: Create route config**

Create `frontend/src/router/routes.tsx`:

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from '@/App'
import AppLayout from '@/components/layout/AppLayout'
import LoginView from '@/views/LoginView'
import DashboardView from '@/views/DashboardView'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'login', element: <LoginView /> },
      {
        element: <AppLayout />,
        children: [{ path: 'dashboard', element: <DashboardView /> }],
      },
    ],
  },
])
```

**Step 4: Point Vite to React entry**

Verify `frontend/index.html` imports:

```html
<script type="module" src="/src/main.tsx"></script>
```

**Step 5: Build**

Run:

```bash
cd frontend && npm run build
```

Expected: May fail because old `.vue` imports remain if any are still referenced. Fix only entry/router references in this task.

**Step 6: Commit**

Run:

```bash
git add frontend/src/router/routes.tsx frontend/src/views/LoginView.tsx frontend/src/views/DashboardView.tsx frontend/src/components/layout/AppLayout.tsx frontend/index.html
git commit -m "feat: add react router skeleton"
```

Expected: commit succeeds.

## Phase 6: State Management and Auth

### Task 13: Migrate Auth Store

**Files:**
- Modify: `frontend/src/stores/auth.ts`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/router/routes.tsx`
- Test: `cd frontend && npm run build`

**Step 1: Replace Pinia auth store with Zustand**

Rewrite `frontend/src/stores/auth.ts`:

```ts
import { create } from 'zustand'
import { authApi, type LoginRequest, type User } from '@/api/auth'
import {
  clearAuthStorage,
  getStoredToken,
  getStoredUser,
  saveAuthState,
  saveStoredUser,
} from '@/utils/authStorage'

type AuthState = {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  isLoggedIn: boolean
  login: (credentials: LoginRequest) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredToken(),
  user: getStoredUser<User>(),
  loading: false,
  error: null,
  get isLoggedIn() {
    return !!get().token
  },
  login: async (credentials) => {
    set({ loading: true, error: null })
    try {
      const response = await authApi.login(credentials)
      const { token, user } = response.data.data
      saveAuthState(token, user)
      set({ token, user, loading: false, error: null })
      return true
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '登录失败' })
      return false
    }
  },
  logout: async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore logout failures and clear local state.
    }
    clearAuthStorage()
    set({ token: null, user: null })
  },
  refreshUser: async () => {
    if (!get().token) return
    try {
      const response = await authApi.getCurrentUser()
      saveStoredUser(response.data.data)
      set({ user: response.data.data })
    } catch {
      await get().logout()
    }
  },
}))
```

**Step 2: Add protected route helper**

In `frontend/src/router/routes.tsx`, create:

```tsx
function ProtectedRoute() {
  const isLoggedIn = useAuthStore((state) => !!state.token)
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />
}
```

Use it around authenticated children.

**Step 3: Restore logout callback**

In `frontend/src/main.tsx`, after router creation is imported:

```ts
setAuthLogout(async () => {
  await useAuthStore.getState().logout()
  router.navigate('/login')
})
```

**Step 4: Build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS after placeholder pages compile.

**Step 5: Commit**

Run:

```bash
git add frontend/src/stores/auth.ts frontend/src/main.tsx frontend/src/router/routes.tsx
git commit -m "feat: migrate auth store to react"
```

Expected: commit succeeds.

### Task 14: Migrate Theme and Layout Stores

**Files:**
- Modify: `frontend/src/stores/theme.ts`
- Modify: `frontend/src/stores/layout.ts`
- Modify: `frontend/src/App.tsx`
- Test: `cd frontend && npm run build`

**Step 1: Convert theme store**

Use Zustand or a small hook that:
- Reads existing persisted theme storage.
- Applies the same body/html classes or data attributes currently applied by Vue store.
- Exposes `theme`, `setTheme`, and `toggleTheme`.

**Step 2: Convert layout store**

Use Zustand state for:
- Sidebar collapsed/open.
- Mobile drawer open if currently present.

**Step 3: Initialize theme in App**

In `frontend/src/App.tsx`, call the theme initialization in `useEffect`.

**Step 4: Build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
git add frontend/src/stores/theme.ts frontend/src/stores/layout.ts frontend/src/App.tsx
git commit -m "feat: migrate theme and layout stores"
```

Expected: commit succeeds.

## Phase 7: Component Migration Slices

### Task 15: Migrate Common Components

**Files:**
- Create React equivalents for:
  - `frontend/src/components/common/StatusBadge.tsx`
  - `frontend/src/components/common/ConfirmModal.tsx`
  - `frontend/src/components/common/DatePicker.tsx`
  - `frontend/src/components/common/GlassCard.tsx`
  - `frontend/src/components/common/ToastContainer.tsx`
- Keep old `.vue` files until no imports reference them.
- Test: `cd frontend && npm run build`

**Step 1: Migrate one component at a time**

For each component:
- Read the Vue component.
- Create the `.tsx` version with typed props.
- Replace local imports only where needed.
- Run TypeScript build.

**Step 2: Use React prop types**

Example pattern:

```tsx
type StatusBadgeProps = {
  status: string
  label?: string
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return <span className={`status-badge status-badge-${status}`}>{label ?? status}</span>
}
```

**Step 3: Build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS or only errors from not-yet-migrated views.

**Step 4: Commit**

Run:

```bash
git add frontend/src/components/common
git commit -m "feat: migrate common components to react"
```

Expected: commit succeeds.

### Task 16: Migrate Layout Components

**Files:**
- Create:
  - `frontend/src/components/layout/AppHeader.tsx`
  - `frontend/src/components/layout/AppSidebar.tsx`
  - `frontend/src/components/layout/AppLayout.tsx`
- Modify: `frontend/src/router/routes.tsx`
- Test: `cd frontend && npm run build`

**Step 1: Port layout markup**

Convert:
- `AppLayout.vue`
- `AppHeader.vue`
- `AppSidebar.vue`

Use:
- `NavLink` from `react-router-dom`.
- Zustand layout store.
- Auth store for user/logout.

**Step 2: Preserve CSS class names**

Keep existing CSS class names from Vue templates where possible to reduce visual regression risk.

**Step 3: Build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS or only missing page components still being migrated.

**Step 4: Commit**

Run:

```bash
git add frontend/src/components/layout frontend/src/router/routes.tsx
git commit -m "feat: migrate app layout to react"
```

Expected: commit succeeds.

### Task 17: Migrate Login Flow

**Files:**
- Modify: `frontend/src/views/LoginView.tsx`
- Modify: `frontend/src/router/routes.tsx`
- Test: manual login against local Go API

**Step 1: Port LoginView**

Convert `frontend/src/views/LoginView.vue` to React:
- Use `useState` for username/password.
- Use `useAuthStore` for `login`, `loading`, and `error`.
- Use `useNavigate` for post-login navigation.

**Step 2: Manual local test**

Run backend:

```bash
task server:dev
```

Run frontend:

```bash
cd frontend && VITE_API_BASE_URL=http://127.0.0.1:3456 npm run dev
```

Open the Vite URL and login with local dev credentials.

Expected:
- Login request succeeds.
- Token is stored.
- User is redirected to `/dashboard`.

**Step 3: Build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS.

**Step 4: Commit**

Run:

```bash
git add frontend/src/views/LoginView.tsx frontend/src/router/routes.tsx
git commit -m "feat: migrate login flow to react"
```

Expected: commit succeeds.

### Task 18: Migrate Dashboard Slice

**Files:**
- Create:
  - `frontend/src/components/dashboard/QuickActions.tsx`
  - `frontend/src/components/dashboard/StatCard.tsx`
  - `frontend/src/components/dashboard/UpcomingPayments.tsx`
  - `frontend/src/components/dashboard/ProjectList.tsx`
  - `frontend/src/components/dashboard/IncomeChart.tsx`
- Modify: `frontend/src/views/DashboardView.tsx`
- Test: manual dashboard load

**Step 1: Port dashboard components**

Preserve API calls from:
- `frontend/src/api/dashboard.ts`
- `frontend/src/api/project.ts`

Use:
- `useEffect` for loading data.
- `useState` for local component state.
- Chart.js integration via `useRef<HTMLCanvasElement>(null)`.

**Step 2: Manual test**

Run:

```bash
task server:dev
cd frontend && VITE_API_BASE_URL=http://127.0.0.1:3456 npm run dev
```

Expected:
- Dashboard stats load.
- Chart renders.
- Recent projects and upcoming payments render.

**Step 3: Build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS.

**Step 4: Commit**

Run:

```bash
git add frontend/src/components/dashboard frontend/src/views/DashboardView.tsx
git commit -m "feat: migrate dashboard to react"
```

Expected: commit succeeds.

### Task 19: Migrate Business Views

**Files:**
- Create/modify:
  - `frontend/src/views/ProjectsView.tsx`
  - `frontend/src/views/ProjectCreateView.tsx`
  - `frontend/src/views/ProjectDetailView.tsx`
  - `frontend/src/views/PaymentCreateView.tsx`
  - `frontend/src/views/CalendarView.tsx`
  - `frontend/src/views/AnalyticsView.tsx`
  - `frontend/src/views/SettingsView.tsx`
- Modify: `frontend/src/router/routes.tsx`
- Test: frontend build and manual smoke test

**Step 1: Migrate routes one page at a time**

For each page:
- Convert `.vue` template to JSX.
- Replace `ref` with `useState`.
- Replace `computed` with `useMemo`.
- Replace `watch` with `useEffect`.
- Replace `router.push` with `useNavigate`.
- Replace `route.params` with `useParams`.

**Step 2: Update route config**

Add routes matching the current Vue router:
- `/projects`
- `/projects/create`
- `/projects/edit/:id`
- `/projects/:id`
- `/projects/:id/payment/create`
- `/payment/create`
- `/calendar`
- `/analytics`
- `/settings`

**Step 3: Manual smoke tests**

Check:
- Project list loads.
- Project create/edit works.
- Payment create works.
- Calendar loads.
- Analytics loads.
- Settings tabs load.

**Step 4: Build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
git add frontend/src/views frontend/src/router/routes.tsx
git commit -m "feat: migrate business views to react"
```

Expected: commit succeeds.

### Task 20: Migrate Settings Components

**Files:**
- Create:
  - `frontend/src/components/settings/TokenManagement.tsx`
  - `frontend/src/components/settings/DataSyncPanel.tsx`
  - `frontend/src/components/settings/NotificationManagement.tsx`
  - `frontend/src/components/settings/UserManagement.tsx`
  - `frontend/src/components/settings/DictionaryManagement.tsx`
- Modify: `frontend/src/views/SettingsView.tsx`
- Test: manual settings smoke test

**Step 1: Port each settings panel**

Preserve API modules:
- `frontend/src/api/token.ts`
- `frontend/src/api/sync.ts`
- `frontend/src/api/notification.ts`
- `frontend/src/api/dictionary.ts`
- user APIs from existing auth/user modules.

**Step 2: Manual smoke tests**

Check:
- Token create/list/revoke.
- Dictionary item CRUD.
- Notification list/detail.
- User management for admin account.
- Sync panel only for admin.

**Step 3: Build**

Run:

```bash
cd frontend && npm run build
```

Expected: PASS.

**Step 4: Commit**

Run:

```bash
git add frontend/src/components/settings frontend/src/views/SettingsView.tsx
git commit -m "feat: migrate settings to react"
```

Expected: commit succeeds.

## Phase 8: Remove Vue and Validate Wails

### Task 21: Delete Vue Files and Vue Router

**Files:**
- Delete all remaining `frontend/src/**/*.vue`
- Delete: `frontend/src/router/index.ts`
- Verify: no Vue imports remain

**Step 1: Search Vue references**

Run:

```bash
rg "from 'vue|from \"vue|vue-router|pinia|\\.vue" frontend/src frontend/package.json frontend/vite.config.ts
```

Expected: no source references after deletion.

**Step 2: Delete obsolete files**

Run:

```bash
find frontend/src -name '*.vue' -print
```

Delete each listed file after confirming the React equivalent exists.

**Step 3: Build**

Run:

```bash
cd frontend && npm run lint
cd frontend && npm run build
```

Expected: PASS.

**Step 4: Commit**

Run:

```bash
git add frontend
git commit -m "chore: remove vue frontend"
```

Expected: commit succeeds.

### Task 22: Validate Wails Desktop Build

**Files:**
- Modify if needed: `build/config.yml`
- Modify if needed: `Taskfile.yml`
- Test: `task build`

**Step 1: Run Wails dev**

Run:

```bash
task dev
```

Expected:
- Wails opens the React app.
- Same-origin `/api` requests work.
- Login works.
- Dashboard loads.

**Step 2: Run production build**

Run:

```bash
task build
```

Expected:
- Frontend React build emits `frontend/dist`.
- Wails embeds `frontend/dist`.
- Desktop binary builds.

**Step 3: Commit fixes**

Run:

```bash
git add build Taskfile.yml frontend main.go
git commit -m "fix: support react frontend in wails"
```

Expected: commit only if changes were needed.

## Phase 9: Vercel Frontend Deployment

### Task 23: Add Vercel Static Frontend Configuration

**Files:**
- Modify: `vercel.json`
- Create: `docs/deployment/vercel-frontend.md`

**Step 1: Configure frontend build**

If using one Vercel project for frontend from repo root, use:

```json
{
  "buildCommand": "cd frontend && npm ci && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "cd frontend && npm ci",
  "rewrites": [
    {
      "source": "/((?!api/.*).*)",
      "destination": "/index.html"
    }
  ]
}
```

If keeping the backend POC in the same Vercel project, preserve `/api/*` rewrites for the POC and route non-API traffic to `index.html`.

**Step 2: Document Vercel settings**

Create `docs/deployment/vercel-frontend.md`:

```markdown
# Vercel Frontend Deployment

## Project Settings

- Framework Preset: Vite
- Root Directory: repository root
- Install Command: `cd frontend && npm ci`
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`

## Environment Variables

- `VITE_API_BASE_URL=https://api.example.com`

## SPA Routing

All non-API routes rewrite to `/index.html`.
```

**Step 3: Local build**

Run:

```bash
cd frontend && npm ci && npm run build
```

Expected: PASS.

**Step 4: Commit**

Run:

```bash
git add vercel.json docs/deployment/vercel-frontend.md
git commit -m "feat: configure vercel frontend deployment"
```

Expected: commit succeeds.

### Task 24: Deploy Preview and Smoke Test

**Files:**
- Modify: `docs/deployment/vercel-frontend.md`

**Step 1: Deploy preview**

Run:

```bash
vercel
```

Expected: Vercel preview URL is created.

**Step 2: Configure env**

Set in Vercel project:

```text
VITE_API_BASE_URL=<backend-api-url>
```

**Step 3: Smoke test**

Check:
- `/login` loads directly.
- Refreshing `/dashboard` returns the app shell.
- Login works against backend API.
- Protected routes redirect when logged out.

**Step 4: Document result**

Update `docs/deployment/vercel-frontend.md` with:
- Preview URL.
- Backend URL.
- Test result.

**Step 5: Commit**

Run:

```bash
git add docs/deployment/vercel-frontend.md
git commit -m "docs: record vercel frontend preview"
```

Expected: commit succeeds.

## Phase 10: Backend Deployment

### Task 25: Choose Backend Host

**Files:**
- Modify: `docs/deployment/web-backend.md`
- Modify: `docs/deployment/vercel-go-poc.md`

**Step 1: Evaluate Vercel Go POC**

Record:
- Can full Gin router be adapted?
- Does hosted DB work?
- Are cold starts acceptable?
- Are route/function limits acceptable?
- Are background jobs or long-lived processes needed?

**Step 2: Decide**

Choose one:

```markdown
## Backend Host Decision

- Selected host:
- Reason:
- Deployment command:
- Environment variables:
- Rollback plan:
```

**Step 3: Commit**

Run:

```bash
git add docs/deployment/web-backend.md docs/deployment/vercel-go-poc.md
git commit -m "docs: decide backend deployment target"
```

Expected: commit succeeds.

### Task 26A: Deploy Go API to Container/Server Platform

Use this task if Vercel Go POC is not a good fit.

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Modify: `docs/deployment/web-backend.md`

**Step 1: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /orange-api ./cmd/server

FROM alpine:3.22
RUN adduser -D -H orange
WORKDIR /app
COPY --from=builder /orange-api /usr/local/bin/orange-api
USER orange
EXPOSE 3456
CMD ["orange-api"]
```

**Step 2: Create .dockerignore**

Create `.dockerignore`:

```text
.git
frontend/node_modules
frontend/dist
bin
*.db
*.log
```

**Step 3: Build image**

Run:

```bash
docker build -t orange-api:local .
```

Expected: PASS.

**Step 4: Run container smoke test**

Run:

```bash
docker run --rm -p 3456:3456 \
  -e JWT_SECRET=replace-with-a-strong-dev-secret-32-characters \
  -e DB_TYPE=sqlite \
  -e ALLOW_PRODUCTION_SQLITE=true \
  orange-api:local
```

Then:

```bash
curl -s http://127.0.0.1:3456/api/health
```

Expected: health response.

**Step 5: Commit**

Run:

```bash
git add Dockerfile .dockerignore docs/deployment/web-backend.md
git commit -m "feat: containerize go api"
```

Expected: commit succeeds.

### Task 26B: Expand Vercel Go Backend

Use this task only if Task 8 passes.

**Files:**
- Modify: `api/health.go`
- Create: `api/[...path].go` or equivalent Vercel Go entrypoint supported by current Vercel runtime
- Modify: `vercel.json`
- Modify: `docs/deployment/vercel-go-poc.md`

**Step 1: Create serverless adapter**

Adapt `router.NewRouter()` to the Vercel Go function handler.

Expected shape:

```go
var once sync.Once
var handler http.Handler

func Handler(w http.ResponseWriter, r *http.Request) {
	once.Do(func() {
		runtime, _, err := app.Bootstrap(app.RuntimeModeServer)
		if err != nil {
			panic(err)
		}
		handler = runtime.Router
	})
	handler.ServeHTTP(w, r)
}
```

**Step 2: Validate no unsafe per-invocation migration behavior**

Confirm `AutoMigrate` and `Seed` are safe under serverless cold starts. If not, move migrations to an explicit command.

**Step 3: Deploy preview**

Run:

```bash
vercel
```

Expected: preview deployment with working `/api/health`.

**Step 4: Smoke test**

Check:
- Login.
- Dashboard stats.
- Project list.

**Step 5: Commit**

Run:

```bash
git add api vercel.json docs/deployment/vercel-go-poc.md
git commit -m "feat: deploy go api on vercel"
```

Expected: commit succeeds.

## Phase 11: Final Verification

### Task 27: Full Local Verification

**Files:**
- Modify only if verification finds issues.

**Step 1: Backend verification**

Run:

```bash
go fmt ./...
go vet ./...
go test ./...
```

Expected: PASS.

**Step 2: Frontend verification**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: PASS.

**Step 3: Desktop verification**

Run:

```bash
task build
```

Expected: PASS.

**Step 4: Web verification**

Run:

```bash
cd frontend && VITE_API_BASE_URL=http://127.0.0.1:3456 npm run dev
task server:dev
```

Expected:
- Login works.
- Dashboard works.
- Project CRUD smoke test works.
- Settings smoke test works.

**Step 5: Commit fixes**

Run:

```bash
git add .
git commit -m "fix: complete migration verification"
```

Expected: commit only if fixes were required.

### Task 28: Cutover Checklist

**Files:**
- Create: `docs/deployment/cutover-checklist.md`

**Step 1: Create checklist**

Create `docs/deployment/cutover-checklist.md`:

```markdown
# Cutover Checklist

## Before Cutover

- [ ] Backend host selected and documented.
- [ ] Production database created.
- [ ] `JWT_SECRET` configured and stored securely.
- [ ] `ALLOWED_ORIGINS` includes Vercel production domain.
- [ ] `VITE_API_BASE_URL` points to production API.
- [ ] Desktop build verified.
- [ ] Web preview verified.
- [ ] Backup and rollback plan documented.

## Cutover

- [ ] Deploy backend.
- [ ] Run database migration.
- [ ] Deploy Vercel frontend.
- [ ] Smoke test login.
- [ ] Smoke test dashboard.
- [ ] Smoke test project create/edit.
- [ ] Smoke test payment create/confirm.

## Rollback

- [ ] Restore previous Vercel deployment.
- [ ] Restore previous backend deployment.
- [ ] Restore database backup if schema migration caused data issues.
```

**Step 2: Commit**

Run:

```bash
git add docs/deployment/cutover-checklist.md
git commit -m "docs: add deployment cutover checklist"
```

Expected: commit succeeds.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Full Vue-to-React rewrite is large | Slow migration, regressions | Migrate by route slices, keep CSS/API stable, commit frequently |
| Go backend does not fit Vercel well | Backend deploy delay | Run Vercel Go POC early; fall back to container/server platform |
| SQLite assumptions leak into web production | Data loss or broken deploy | Enforce hosted DB for web production; keep SQLite desktop-only |
| CORS misconfiguration blocks web app | Login/API failures | Add router CORS tests and document env vars |
| Auth behavior changes during store migration | Security regression | Preserve API interceptors and protected route tests/manual checks |
| Wails build breaks after React migration | Desktop release blocked | Validate `task dev` and `task build` before deleting Vue |

## Definition of Done

- React frontend builds with `cd frontend && npm run build`.
- No Vue, Vue Router, or Pinia dependencies remain.
- Wails desktop build works with embedded React assets.
- Standalone Go API starts with `task server:dev`.
- Web frontend deploys to Vercel.
- Backend deployment target is selected and documented.
- Hosted web mode uses PostgreSQL/MySQL, not SQLite.
- Login, dashboard, projects, payments, calendar, analytics, and settings pass smoke tests in both web and desktop modes.

