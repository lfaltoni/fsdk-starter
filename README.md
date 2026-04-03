# FSDK Starter

Full-stack template app built on [foundation-sdk](https://github.com/lfaltoni/foundation-sdk) and [frontend-lib](https://github.com/lfaltoni/frontend-lib). Every foundation-sdk domain is pre-wired — clone this and build your product on top.

## Quick Start

```bash
# 1. Set up backend
cd server
cp .env.example .env
pip install -e ../../foundation-sdk
pip install flask-cors python-dotenv

# 2. Set up frontend
cd ../frontend
cp .env.local.example .env.local
npm install

# 3. Build frontend-lib (required — dist/ is gitignored)
cd ../../frontend-lib
npm install && npm run build
cd ../fsdk-starter

# 4. Run
./dev.sh
# Backend → http://localhost:5001
# Frontend → http://localhost:3000
```

## Seed Admin User

```bash
cd server
python app.py --seed-admin
# Creates: admin@starter.local / admin123 (super_admin role)
```

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

frontend-lib sends JWT Bearer tokens via `foundationRequest`. foundation-sdk blueprints authenticate via Flask-Login sessions (`@login_required`). In dev, the frontend (`:3000`) and backend (`:5001`) are different origins, so session cookies don't survive cross-origin requests.

`server/app.py` includes a `@app.before_request` hook that decodes the JWT from the `Authorization` header and calls `login_user()`, bridging the two auth systems transparently. All `@login_required` and `@require_platform_admin` decorators work without modification.

If you remove this hook, all authenticated API calls from the frontend will fail with 401.

### SameSite Cookie Configuration

`SameSite=None` cookies require `Secure` (HTTPS). In local dev over HTTP, the backend sets `SameSite=Lax` instead. This is controlled by the `ENVIRONMENT` env var — `development` uses `Lax`, anything else uses `None` + `Secure`.

### Optional Domains

MFA, billing, and tenancy are env-gated. When their env vars are empty/false, the blueprints are not registered and their endpoints return 404. The frontend pages handle this gracefully:
- **MFA** — shows "not configured" message when `MFA_HMAC_KEY` is unset
- **Billing** — hidden from nav when `NEXT_PUBLIC_ENABLE_BILLING` is not `true`
- **Media** — treats 404 on gallery as empty (no uploads yet)

### Creating Users Programmatically

Use `user_service.create_user()`, not `auth_service.register()`. The auth service only validates credentials and returns a result — it does not create the User model, profile, or run lifecycle hooks. `user_service.create_user()` handles the full pipeline: auth registration, User + UserProfile creation, lifecycle hooks, and commit.

## Adding Your Own Domain

1. Add a blueprint to `server/app.py` (follow the existing patterns)
2. Add types, API client, and hook to `frontend-lib` (see `frontend-lib/ARCHITECTURE.md`)
3. Add a page under `frontend/src/app/`
4. Import the hook from `frontend-lib` and wire it up

## Tech Stack

- **Backend:** Flask + foundation-sdk (SQLite, Flask-Smorest, Flask-Login)
- **Frontend:** Next.js 15 (App Router, Turbopack) + frontend-lib (React hooks)
- **Styling:** Tailwind CSS v4
