# RBAC E2E Contract Tests

These tests are a production-level contract for multi-user RBAC behavior across:

- Browser route and navigation guards.
- Team-management UI visibility.
- Backend API authorization.
- Direct Supabase/RLS authorization.

They intentionally create disposable users, a company, memberships, invites, and join requests. The fixture deletes records at the end of each run.

## Safety Gate

Remote Supabase projects are blocked by default. To run against the shared development project, opt in explicitly:

```bash
RBAC_E2E_ALLOW_SHARED_DEV=true npm run e2e:rbac
```

Production-looking targets are blocked unless `RBAC_E2E_ALLOW_PROD=true` is also set. Do not use that for normal development.

## Requirements

- Frontend env: `.env.local`
- Backend env: `../startup_digital_twin_backend/.env`
- Supabase service-role key available to the backend env
- Backend reachable at `E2E_BACKEND_URL` or `http://127.0.0.1:8080`
- Frontend reachable at `E2E_BASE_URL` or `http://127.0.0.1:5173`

Playwright will reuse running servers or start them from the config.

## Useful Commands

```bash
npm run e2e:rbac:list
RBAC_E2E_ALLOW_SHARED_DEV=true npm run e2e:rbac
RBAC_E2E_ALLOW_SHARED_DEV=true npm run e2e:rbac -- --headed
RBAC_E2E_ALLOW_SHARED_DEV=true npm run e2e:rbac -- --debug
```

## Expected Current State

Some specs are expected to fail before RBAC hardening. Those failures are the change list: profile self-escalation, join-request RPC authorization, backend join-request listing, invite role mismatch, ecosystem writes, and `vc` DB enum support.
