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

