# Cutover Checklist

## Before Cutover

- [ ] Backend host selected and documented.
- [ ] Production database created.
- [ ] `JWT_SECRET` configured and stored securely.
- [ ] `ALLOWED_ORIGINS` includes the Vercel production domain.
- [ ] `FRONTEND_URL` points to the Vercel production domain.
- [ ] `VITE_API_BASE_URL` points to the production API.
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
