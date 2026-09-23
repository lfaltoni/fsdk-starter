# FSDK Starter

Full-stack template app built on [foundation-sdk](https://github.com/lfaltoni/foundation-sdk) and [fsdk-ts](https://github.com/lfaltoni/fsdk-ts). Every foundation-sdk domain is pre-wired — clone this and build your product on top.

## Quick Start

```bash
./dev.sh
# Backend  → http://localhost:5001
# Frontend → http://localhost:3000
# Admin    → admin@admin.com / admin
```

`dev.sh` handles first-run setup automatically:
- Creates `server/.env` from `.env.example` if missing
- Runs `npm install --install-links` if `node_modules/` doesn't exist
- Seeds an admin user (`admin@admin.com` / `admin`)
- Starts both backend and frontend

Use `./dev.sh --no-seed` to skip seeding on subsequent runs.

### Prerequisites

- Python 3.12+ with `foundation-sdk` installed (`pip install -e ../path/to/foundation-sdk`)
- Node.js 18+
- [fsdk-ts](https://github.com/lfaltoni/fsdk-ts) built (`dist/` is gitignored) — the frontend references it via `file:` path

## File Structure

```
fsdk-starter/
  dev.sh                          # Start both services
  server/
    app.py                        # Flask backend (all domains wired)
    .env.example                  # Backend config template
    requirements.txt
  frontend/
    src/
      app/
        layout.tsx                # Root layout (env injection, Tailwind)
        page.tsx                  # Home (redirects to dashboard or login)
        (auth)/                   # Public pages
          login/page.tsx
          register/page.tsx
          forgot-password/page.tsx
          reset-password/page.tsx
        (app)/                    # Authenticated pages
          layout.tsx              # Auth guard
          dashboard/page.tsx
          profile/page.tsx
          mfa/page.tsx
          reviews/page.tsx
          media/page.tsx
          sessions/page.tsx
        (admin)/                  # Admin-only pages
          layout.tsx              # Admin guard (super_admin check)
          users/page.tsx
          users/[id]/page.tsx
          audit/page.tsx
          invites/page.tsx
        billing/page.tsx          # Optional (env-gated)
      components/                 # Shared UI components
```

## Domain Reference

| Domain | Backend | Hook | Page |
|--------|---------|------|------|
| Auth | `auth_blp` | `useLogin`, `useAuth`, `usePasswordReset` | `/login`, `/register`, `/forgot-password`, `/reset-password` |
| Profile | `profile_blp` | `useAccount` | `/profile` |
| MFA | `mfa_blp` | `useMfa` | `/mfa` |
| Reviews | `reviews_blp` | `useReviews` | `/reviews` |
| Media | `media_blp` | `mediaApi` | `/media` |
| Sessions | `sessions_blp` | `useSessions` | `/sessions` |
| Admin Users | `admin_session_blp` | `useAdmin` | `/users`, `/users/[id]` |
| Audit | `audit_blp` | `useAudit` | `/audit` |
| Invites | `invites_blp` | `useInvites` | `/invites` |
| Billing | `billing_blp` (optional) | `useBilling` | `/billing` |

## Configuration

### Backend (`server/.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SECRET_KEY` | `dev-secret...` | Flask session + JWT signing |
| `DB_NAME` | `instance/starter.db` | SQLite database path |
| `APP_NAME` | `FSDK Starter` | Branding in emails and API |
| `GOOGLE_CLIENT_ID` | (empty) | Google SSO — empty disables it |
| `MFA_HMAC_KEY` | (empty) | MFA secret — empty disables MFA |
| `RESEND_API_KEY` | (empty) | Resend email — empty uses no-op |
| `ENABLE_BILLING` | `false` | Enable Stripe billing domain |
| `ENABLE_TENANCY` | `false` | Enable teams/tenancy domain |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |

### Frontend (`frontend/.env.local`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_FOUNDATION_URL` | `http://localhost:5001` | Backend API URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | (empty) | Google SSO client ID |
| `NEXT_PUBLIC_ENABLE_BILLING` | `false` | Show billing nav item |

## Architecture Notes

### JWT-to-Session Bridge

fsdk-ts sends JWT Bearer tokens via `foundationRequest`. foundation-sdk blueprints authenticate via Flask-Login sessions (`@login_required`). In dev, the frontend (`:3000`) and backend (`:5001`) are different origins, so session cookies don't survive cross-origin requests.

`server/app.py` includes a `@app.before_request` hook that decodes the JWT from the `Authorization` header and calls `login_user()`, bridging the two auth systems transparently. All `@login_required` and `@require_platform_admin` decorators work without modification.

If you remove this hook, all authenticated API calls from the frontend will fail with 401.

### Media Authorization (`MEDIA_OWNER_RULES`) — read this before adding media

The media endpoints take `entity_type` and `entity_id` straight from the request body/URL. `MediaService` only enforces ownership when an `owner_check` predicate has been injected; with none configured it **allows every mutation** (`foundation/media/services.py::_check_owner` returns early). Registering `media_blp` without configuring one lets any logged-in user upload to, delete from, reorder and re-flag media on any entity they can name — OWASP API1 / BOLA.

`server/app.py` section 9a therefore defines a **deny-by-default registry**:

```python
MEDIA_OWNER_RULES: dict[str, Callable[[str, int], bool]] = {}
MediaService.configure(owner_check=media_owner_check)
```

An `entity_type` with no entry cannot be mutated at all. When you add a media-bearing model, add its rule — forgetting to is a 403, never a hole. The registration site raises `RuntimeError` at startup if the `configure()` call goes missing, so the IDOR cannot come back silently.

When you write a rule:
- Key on a **real ownership column** — a non-nullable FK to users, or a membership row. Never on audit metadata such as `created_by_user_id`: it is nullable, so it denies the real owner on legacy rows.
- If your app has roles, **membership alone is not the gate**. A read-only role that resolves to the right org must still be refused a write.
- Return `False`, never `None`.

The starter registers nothing, because it ships no media-bearing entity: the demo page's `entity_type='demo_items'` uses a string `entity_id` (`'demo-1'`) that cannot reach the `<int:entity_id>` routes, and `User`'s primary key is a TEXT uuid, so `entity_type='user'` is unaddressable too. Reads (the gallery GETs) are public and ungated by design — the predicate governs writes only.

Tests: `server/tests/test_media_authorization.py` (run `server/.venv/bin/python -m pytest tests/` from `server/`). They are deliberately negative — a "the owner can upload" test passes identically with or without an authorization check — and cover every mutating endpoint across **both** auth channels, because `auth_required` tries the session cookie first and only falls through to JWT.

### Optional Domains

MFA, billing, and tenancy are env-gated. When their env vars are empty/false, the blueprints are not registered and their endpoints return 404. The frontend pages handle this gracefully:
- **MFA** — shows "not configured" message when `MFA_HMAC_KEY` is unset
- **Billing** — hidden from nav when `NEXT_PUBLIC_ENABLE_BILLING` is not `true`
- **Media** — treats 404 on gallery as empty (no uploads yet)
- **Tenancy/teams** — hidden until `ENABLE_TENANCY=true`. The teams domain fails **closed** on a post-H3 foundation: `create_invite()` / `change_member_role()` raise `RuntimeError` if `app.config['RBAC']` is unset. `server/app.py` therefore wires a generic `owner/admin/editor/viewer` `RBACConfig` **unconditionally** (harmless when the flag is off), so flipping `ENABLE_TENANCY=true` works out of the box. Customize the permission strings when you add your own `require_permission()` gates — see `foundation/teams/rbac.py` and the blogmachine `config.py` reference.

### Turbopack + fsdk-ts

Turbopack cannot follow symlinks outside the project root. The frontend's `package.json` references fsdk-ts via `"file:../../rihla/fsdk-ts"` — use `npm install --install-links` so the dependency is copied into `node_modules/` instead of symlinked. `dev.sh` handles this automatically.

## Adding Your Own Domain

1. Add a blueprint to `server/app.py` (follow the existing patterns)
2. Add types, API client, and hook to `fsdk-ts` (see `fsdk-ts/ARCHITECTURE.md`)
3. Add a page under `frontend/src/app/`
4. Import the hook from `fsdk-ts` and wire it up

Run `npm run typecheck` (`tsc --noEmit`) in `frontend/` to catch type errors. The frontend enforces types at build (`next.config` `ignoreBuildErrors` is `false`), so example-page drift from the fsdk-ts API fails the build.

## Tech Stack

- **Backend:** Flask + foundation-sdk (SQLite, Flask-Smorest, Flask-Login)
- **Frontend:** Next.js 15 (App Router, Turbopack) + fsdk-ts (React hooks)
- **Styling:** Tailwind CSS v4
