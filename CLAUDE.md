# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScoutIQ is a football scouting platform with role-based access for players, scouts, club admins, and global admins. It is a full-stack app: a React/TypeScript frontend and a FastAPI/Python backend backed by PostgreSQL. It uses the Groq API for AI integration and python-telegram-bot for sending notifications to scouts.

Each role has its own distinctive dashboard, pages, and sections. A player must never access admin routes, and vice-versa — role enforcement exists on both frontend (`RoleRoute`) and backend (`require_role` dependency).

## Development Commands

### Frontend (`cd frontend`)

```bash
npm run dev        # Start Vite dev server on port 8080
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # ESLint
npm run test       # Vitest single run
npm run test:watch # Vitest watch mode
npm run preview    # Preview production build
```

### Backend (`cd backend`)

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload   # Dev server on port 8000
```

## Environment Variables

**Frontend** (`frontend/.env`):

```
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=<google oauth client id>
```

**Backend** (`backend/.env`):

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/scoutiq
JWT_SECRET_KEY=<random 64+ char secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=http://localhost:8080
DEBUG=true                          # set true in dev; false (or omit) in production
GOOGLE_CLIENT_ID=<google oauth client id>
GOOGLE_CLIENT_SECRET=<google oauth client secret>
GMAIL_USER=<gmail address>
GMAIL_APP_PASSWORD=<gmail app password>
GROQ_API_KEY=<groq api key>
TELEGRAM_BOT_TOKEN=<telegram bot token>
TELEGRAM_BOT_USERNAME=<bot username without @>
FRONTEND_URL=http://localhost:8080
```

> `DEBUG=true` enables Swagger UI at `/api/docs` and sets cookies to `secure=False` (required for HTTP in dev). Never set it in production.

## Architecture

### Frontend (`frontend/src/`)

**Framework:** React 18 + TypeScript + Vite, styled with Tailwind CSS and Radix UI (shadcn/ui style).

**State management:**
- `AuthContext` (`contexts/AuthContext.tsx`) — authentication state and session restoration
- `RoleContext` (`contexts/RoleContext.tsx`) — role derived from auth state
- TanStack React Query — all server state (fetching/caching)
- React Hook Form + Zod — form state and validation

**Routing:** React Router v6. `App.tsx` defines all routes. `ProtectedRoute` enforces authentication; `RoleRoute` restricts by role. Unauthenticated users are redirected to `/login`; wrong-role users are redirected to their own dashboard.

**API communication:** `src/api/client.ts` — shared Axios instance with `withCredentials: true`. Automatically injects the Bearer token and handles silent token refresh on 401. Concurrent requests during refresh are queued and replayed. On refresh failure, tokens are cleared and the user is redirected to `/login`.

**API modules** (`src/api/`):
- `auth.ts` — login, register, logout, refresh, me, Google OAuth, password reset
- `scout.ts` — scout dashboard, players, reports, saved prospects, dropdown
- `player.ts` — player profile, highlights
- `clubAdmin.ts` — club admin dashboard, my players, salaries, reports
- `notifications.ts` — list, mark read
- `ai.ts` — Groq AI chat
- `telegram.ts` — link code generation, disconnect, status

### Frontend Routes (`App.tsx`)

| Path | Component | Access |
|------|-----------|--------|
| `/` | `LandingPage` | Public |
| `/login` | `LoginPage` | Public |
| `/register` | `RegisterPage` | Public |
| `/forgot-password` | `ForgotPasswordPage` | Public |
| `/reset-password` | `ResetPasswordPage` | Public |
| `/auth/google/callback` | `GoogleCallbackPage` | Public |
| `/dashboard` | Redirects to role dashboard | Auth |
| `/dashboard/scout` | `ScoutDashboard` | scout |
| `/dashboard/player` | `PlayerDashboard` | player |
| `/dashboard/club` | `ClubDashboard` | club_admin |
| `/dashboard/admin` | `AdminDashboard` | global_admin |
| `/dashboard/players` | `PlayersPage` | scout |
| `/dashboard/saved-prospects` | `SavedProspectsPage` | scout |
| `/dashboard/reports` | `ReportsPage` | scout |
| `/dashboard/ai` | `AIAssistantPage` | scout |
| `/dashboard/highlights` | `HighlightsPage` | player |
| `/dashboard/my-players` | `MyPlayersPage` | club_admin |
| `/dashboard/club-reports` | `ClubReportsPage` | club_admin |
| `/dashboard/salaries` | `SalariesPage` | club_admin |
| `/dashboard/admin/users` | `AdminUsersPage` | global_admin |
| `/dashboard/admin/clubs` | `AdminClubsPage` | global_admin |
| `/dashboard/admin/leagues` | `AdminLeaguesPage` | global_admin |
| `/dashboard/admin/players` | `AdminPlayersPage` | global_admin |
| `/dashboard/admin/reports` | `AdminReportsPage` | global_admin |
| `/dashboard/notifications` | `NotificationsPage` | All auth |
| `/dashboard/settings` | `SettingsPage` | All auth |

**Dashboard layout** (`components/DashboardLayout.tsx`): collapsible sidebar on desktop, bottom nav bar on mobile (first 5 items), slide-in drawer on mobile. Top header has role badge, theme toggle, notification bell with unread count, logout, and avatar link to settings.

### Backend (`backend/app/`)

**Framework:** FastAPI with SQLAlchemy 2.0 ORM, Pydantic v2 schemas, and bcrypt + PyJWT authentication.

**Structure:**
- `main.py` — app creation, CORS, router registration, global exception handler (logs + 500)
- `config.py` — pydantic-settings `Settings` loaded from `.env`
- `database.py` — SQLAlchemy engine, session factory, connection pool (size 10, overflow 20)
- `security.py` — JWT creation/verification, bcrypt hashing, refresh token generation
- `dependencies.py` — `get_current_user`, `require_role(...)` FastAPI `Depends()` helpers
- `limiter.py` — SlowAPI rate limiter
- `bot.py` — Telegram bot (polling mode, daemon thread)
- `email.py` — password reset emails via Gmail SMTP
- `tasks.py` — background task scheduler

**Routers** (`routers/`):

| File | Prefix | Description |
|------|--------|-------------|
| `auth.py` | `/auth` | Login, register, refresh, logout, Google OAuth, password reset, profile |
| `admin.py` | `/admin` | Global admin CRUD for users, clubs, leagues, players, reports |
| `club_admin.py` | `/club` | Club admin dashboard, player management, salaries, reports |
| `scout.py` | `/scout` | Scout dashboard, player browsing, saved prospects, scouting reports, dropdown |
| `player.py` | `/player` | Player profile, stats |
| `highlights.py` | `/highlights` | Player highlight video links |
| `notifications.py` | `/notifications` | In-app notifications |
| `ai.py` | `/ai` | Groq AI chat (rate-limited 20/min, scout only) |
| `telegram.py` | `/telegram` | Link code generation, disconnect, status |

**Models** (`models/`):

| File | Key fields |
|------|-----------|
| `user.py` | `User`, `RefreshToken` — UUID PK, role, status (active/inactive/suspended), soft delete, Google OAuth, Telegram fields |
| `player.py` | `Player` — linked to `User`, position, stats (goals, assists, minutes, etc.), market value, status |
| `club.py` | `Club` — name, logo_url, league_id |
| `league.py` | `League` — name |
| `report.py` | `ScoutingReport` — player_name, position, rating (1–100), status (draft/submitted/approved/rejected), notes |
| `saved_prospect.py` | `SavedProspect` — scout_id → player_id |
| `player_highlight.py` | `PlayerHighlight` — external video URL (YouTube/Vimeo/GDrive), max 6 per player |
| `player_contract.py` | `PlayerContract` — salary, start/end dates, unique per player |
| `player_market_value_history.py` | `PlayerMarketValueHistory` — timestamped value snapshots |
| `player_view.py` | `PlayerView` — tracks which scout viewed which player |
| `notification.py` | `Notification` — type, title, message, is_read |
| `password_reset_token.py` | `PasswordResetToken` — hashed token, 10-min expiry, one-time use |

**Auth flow:**
- Login → access token (JWT, 15 min, stored in-memory on frontend) + refresh token (hashed in DB, 7 days, set as `httpOnly; SameSite=Lax` cookie)
- On 401 → frontend calls `/auth/refresh` with cookie; gets new access token back; queued requests replay
- `DEBUG=true` sets `secure=False` on the cookie (required for HTTP in dev)
- All protected endpoints: `Depends(get_current_user)`
- Role-restricted endpoints: `Depends(require_role("scout"))` etc.
- Global admin endpoints: `Depends(require_global_admin)`

**Rate limiting:**
- Login: 10 req/min
- Google callback: 20 req/min
- Forgot password: 5 req/min
- Reset password: 10 req/min
- AI chat: 20 req/min

**API prefix:** All routes are under `/api/v1/`.

**Swagger UI:** Only available when `DEBUG=true` at `/api/docs`. Disabled in production.

### External Integrations

**Groq AI** (`routers/ai.py`): Scout-only chat endpoint. Builds context from up to 40 active players + 20 of the scout's reports + all saved prospects, then sends to `llama-3.3-70b-versatile`. Messages capped at 2000 chars, responses at 1024 tokens.

**Telegram** (`bot.py`, `routers/telegram.py`): Scouts can link their Telegram account via a `secrets.token_urlsafe(32)` code (15-min TTL). Bot uses polling. Notifications sent via `send_message()`. Used to notify scouts when reports are updated.

**Google OAuth** (`routers/auth.py`): PKCE flow. Frontend generates verifier/challenge, redirects to Google, exchanges code on backend. Auto-creates scout account on first Google login.

**Gmail** (`email.py`): Password reset emails via SMTP with STARTTLS.

### User Roles

| Role | Dashboard | Key capabilities |
|------|-----------|-----------------|
| `player` | `/dashboard/player` | View own profile, manage highlight videos |
| `scout` | `/dashboard/scout` | Browse players, save prospects, write reports, AI assistant, Telegram notifications |
| `club_admin` | `/dashboard/club` | Manage club players, view salaries/contracts, view scouting reports on their players |
| `global_admin` | `/dashboard/admin` | Full CRUD: users, clubs, leagues, players, reports |

### Key Components

- `DashboardLayout` — sidebar + mobile nav, role-aware navigation, notification badge
- `ProtectedRoute` — redirects unauthenticated users to `/login` with `state.from` preserved
- `RoleRoute` — redirects wrong-role users to their own dashboard
- `BulkImportModal` — CSV bulk import for admin player management
- `ClubLogo` — club logo with fallback initials
- `BouncingBall` — landing/auth page animated decoration

### Migrations

Run scripts in `backend/app/migrations/` manually against the DB when needed:
- `add_player_highlights.py`
- `add_contract_uniqueness.py`
- `add_notifications_and_highlight_status.py`
- `add_player_stats_and_history.py`
- `redesign_contracts.py`
- `add_telegram_fields.py`
- `seed_demo_players.py` — seeds demo player data

### Testing

Frontend uses **Vitest** with `@testing-library/react`. Test files match `src/**/*.{test,spec}.{ts,tsx}`. Setup file: `src/test/setup.ts`.

Playwright E2E tests live in `tests/` with page objects in `tests/pages/`. Tests are serial per describe block and share a browser context. Tests numbered 1–19 cover auth, scout, player, club admin, and global admin flows.

Backend has no test framework configured.

## General Rules

- `.claude` and `.env` are not to be committed.
- Best practices for Python and React are to be used to ensure security and stability.
- No comments within the code.
- If prompted to write PlantUML code for diagrams, do not use autonumber — type sequential numbers manually.

## UI Conventions

- **Loading states**: Use `<Spinner>` from `@/components/ui/spinner` — wrap in `<div className="flex items-center justify-center h-64">`. Available sizes: `sm`, `md`, `lg`. For page-level spinners use `size="lg"` with a `label` prop (e.g. `label="Loading players…"`) — the label renders centered below the spinner. Inline spinners (e.g. inside buttons) omit the label.
- **Error states**: Use `<Alert variant="destructive">` from `@/components/ui/alert` with `<AlertCircle>` icon, `<AlertTitle>Error</AlertTitle>`, and `<AlertDescription>` — wrap in `<div className="flex items-center justify-center h-64">` with `max-w-md` on the alert.
- **Toasts**: Use `toast.success` / `toast.error` from `sonner`. Wording: `"X created successfully."`, `"X updated successfully."`, `"X deleted successfully."` for CRUD. Errors: `"Failed to [action]."`. Keep them short and sentence-cased.
- **Tables**: Use TanStack Table (`@tanstack/react-table`) with `createColumnHelper`. Include sorting, pagination (pageSize 10), and a global filter input. Desktop: `<Table>` in a `<Card>`. Mobile: card-based list layout.
- **Dialogs**: Use Radix `<Dialog>` for create/edit/view modals, `<AlertDialog>` for destructive confirmations.
- **Player dropdown (in forms)**: Uses `<Popover>` + `<Command>` (not `<Select>`). Fetches players via `/scout/players/dropdown` — fires when the popover opens (up to 20 results), on 2+ char search, or on position filter selection.

## Jira Conventions

- **Understanding a ticket**: Thoroughly read the summary and description before starting. Feature tickets contain full implementation details (files, endpoints, migrations). Bug tickets contain replication steps — replicate before fixing.
- **Workflow**: Switch status from To Do → In Progress when starting. Move to QA - To Do when done.

## Already Implemented

Production-hardening items that have been completed. Listed here for historical reference.

- **Health check endpoint** — `GET /api/health` added to `main.py`. Returns `{"status": "ok"}` unauthenticated; usable by load balancers and uptime monitors.
- **HTTP security headers** — `SecurityHeadersMiddleware` added to `main.py`. Sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` on every response.
- **Session invalidation on password change** — `change_password` in `auth.py` now revokes all non-expired `RefreshToken` rows for the user immediately after the password hash is updated.
- **Stale refresh token cleanup** — `_purge_expired_refresh_tokens()` added to `tasks.py`, runs hourly in the background thread alongside the inactivity check.
- **DB connection pool_recycle** — `pool_recycle=1800` added to the SQLAlchemy engine in `database.py` to prevent silent connection drops from firewall idle timeouts.
- **Log silenced exceptions** — Bare `except Exception: pass` blocks in `tasks.py` (inactivity loop), `bot.py` (`send_message`), and `auth.py` (`forgot_password` email send) replaced with `logger.exception(...)` so failures are visible in logs.
- **Fix `NotFound.tsx`** — Removed `console.error()` from `useEffect` and replaced plain `<a href="/">` with React Router `<Link to="/">` to avoid a full-page reload on 404.
- **Remove placeholder OG image** — Removed `og:image` and `twitter:image` meta tags from `index.html` that pointed to `/placeholder.svg` to avoid broken social preview cards.

## Future Features

This section tracks what needs to be built or hardened before the application is production-ready. Items are grouped by category and ordered roughly by priority within each group.

### Infrastructure & Deployment

- **Containerization** — Add `Dockerfile` for both `frontend/` and `backend/`, and a root `docker-compose.yml` that wires them together with a PostgreSQL service. Needed for reproducible builds and any cloud deploy target.
- **Nginx config** — Add an `nginx/nginx.conf` that serves the Vite build as static files and reverse-proxies `/api/` to uvicorn. Without this the frontend and backend must be served by separate processes on different ports.
- **Production CI/CD pipeline** — The current `.github/workflows/e2e.yml` runs E2E tests only. Add separate `ci.yml` (lint + unit tests on every PR) and `deploy.yml` (build images, push to registry, deploy to server on merge to `main`).
- **Environment config for production** — Document required prod `.env` values explicitly (e.g., `DEBUG=false`, `ALLOWED_ORIGINS`, cookie `secure=True`, strong `JWT_SECRET_KEY`). Consider a `.env.example` file committed to the repo.
- **Dependency pinning** — `backend/requirements.txt` uses minimum-version operators (`>=`) only, so builds are not reproducible. Use `pip-compile` (pip-tools) to generate a locked `requirements.lock`. Frontend `package.json` uses `^` semver ranges; `package-lock.json` already locks transitive deps but the discrepancy should be documented.
- **Dependency security scanning** — Add Dependabot (`dependabot.yml`) for automated PRs on vulnerable dependencies, and a `safety` check for Python packages in CI.

### Security

- **Rate limiting on all mutating endpoints** — Currently only login, Google callback, forgot/reset password, and AI chat are rate-limited. Register, profile update, notification mark-read, and all admin CRUD endpoints are unprotected and should have per-IP or per-user limits added via `@limiter.limit(...)`.
- **Account lockout on repeated failed logins** — SlowAPI enforces 10/min at IP level but does not lock an account after N consecutive failures. Add a `failed_login_count` + `locked_until` column to `User` and check it in the login route.
- **Tighten CORS in production** — `main.py` passes `allow_methods=["*"]` and `allow_headers=["*"]`. In production restrict to the specific HTTP verbs and headers the frontend actually uses.
- **Email verification on registration** — `POST /auth/register` sets `status = "active"` immediately. Add an email verification step (token in DB, verified flag on `User`) so unverified addresses cannot accumulate.
- **Logout all sessions** — Add `POST /auth/logout-all` that revokes every non-expired `RefreshToken` for the current user. Needed when a device is lost or an account is compromised.
- **Google SSO role restriction** — New Google OAuth users are hardcoded to `role="scout"` in `auth.py`. Add a post-OAuth role selection step (or a query parameter) so players and club admins can also register via Google.
- **Avatar URL validation** — `avatar_url` on `User` is a free-form string. Validate that it is a URL belonging to a trusted domain (Google profile CDN or the app's own `/static/` path) before storing.
- **Two-factor authentication (2FA)** — TOTP-based 2FA (Google Authenticator / Authy) for accounts with elevated roles (`scout`, `club_admin`, `global_admin`).
- **Audit log** — Record every admin action (user created/suspended/deleted, player edited, report approved/rejected) to an `audit_log` table with `actor_id`, `action`, `target_type`, `target_id`, and `payload`. Surface it in the admin dashboard.

### Database & Migrations

- **Adopt Alembic** — Replace the current ad-hoc Python migration scripts in `backend/app/migrations/` with Alembic. This gives versioned, reversible up/down migrations and makes the CI pipeline (`e2e.yml`) more robust (currently it runs scripts manually in a fixed order).
- **Add database indexes** — Queries that filter by `Player.status`, `ScoutingReport.status`, `ScoutingReport.scout_id`, `SavedProspect.scout_id`, and `Notification.user_id` run frequently but have no index. Add composite indexes where needed.
- **Backup strategy** — Document (or automate via cron) `pg_dump` backups of the production database to object storage (S3 / R2). Include restore procedure.
- **Unbounded-growth tables** — `player_views`, `ai_usage_log`, and `notifications` are never pruned. Add age-based cleanup to the background task (e.g., delete `player_views` older than 90 days, `ai_usage_log` older than 1 year, `notifications` older than 30 days).
- **PostgreSQL SSL enforcement** — `database.py` is missing `connect_args={"sslmode": "require"}` for production TLS enforcement.
- **Server-side pagination on admin/scout/club list endpoints** — All admin list endpoints (`GET /admin/users`, `/admin/clubs`, `/admin/leagues`, `/admin/players`, `/admin/reports`) return the entire table with no `page`/`limit` parameters. Same for `GET /club/players` and `GET /scout/saved-prospects`. At scale this causes timeouts. Add `skip`/`limit` (or cursor-based) pagination to all list endpoints.

### Observability & Monitoring

- **Structured logging** — Add a JSON-formatted log configuration wired at startup in `main.py`. All routers should log at appropriate levels with consistent fields (`user_id`, `request_id`, `action`). Note: silenced exceptions in `tasks.py`, `bot.py`, and `auth.py` have been fixed; full structured logging is the remaining gap.
- **Request ID middleware** — Add a FastAPI middleware that generates a `X-Request-ID` header per request and injects it into log records. Makes tracing across log lines possible.
- **Error monitoring** — Integrate Sentry (`sentry-sdk[fastapi]` on the backend, `@sentry/react` on the frontend). The global exception handler in `main.py` is the correct place to call `sentry_sdk.capture_exception`.
- **Uptime / alerting** — Wire the `/api/health` endpoint into an uptime monitor (e.g., UptimeRobot, Betterstack) to alert on downtime.

### Testing

- **Backend unit tests** — The backend has no test framework configured. Add `pytest` + `httpx` (`AsyncClient`) with a test database. Priority targets: auth flow (login, refresh, logout), role enforcement (`require_role`), and the AI daily usage cap logic.
- **Frontend unit test coverage** — Only one placeholder test file exists (`frontend/src/test/example.test.ts`). Add Vitest tests for: `AuthContext` token refresh logic, `RoleRoute` redirect behaviour, and key form validation schemas (Zod).
- **Backend integration tests** — Use a real test PostgreSQL instance (already done in CI for E2E) to test full request cycles for admin CRUD, scout report creation, and notification dispatch.

### Frontend Resilience

- **Error boundary** — Add a React `ErrorBoundary` component wrapping `<DashboardLayout>` (and ideally each route). Without it an unhandled render error in one page crashes the entire shell, including the sidebar and navigation.
- **Route-level code splitting** — `App.tsx` imports all 25+ page components eagerly. Wrap each dashboard route in `React.lazy` + `Suspense` to reduce the initial bundle size.
- **PWA manifest** — Add `frontend/public/manifest.json` and the corresponding `<link rel="manifest">` in `index.html` so the app is installable on mobile and passes Lighthouse PWA checks.
- **ARIA live regions** — The notification bell and toast messages have no `aria-live="polite"` region. Screen readers will not announce new notifications or toasts.

### Feature Completeness

- **Email notifications for key events** — `email.py` only sends password reset emails. Add transactional emails for: scouting report status change (scout notified), new player viewed by scout (player notified), account suspension (user notified). Use the same Gmail SMTP helper.
- **Market value history chart** — `PlayerMarketValueHistory` model and snapshots exist but there is no UI for it. Add a line chart (Recharts or similar) to the player profile card visible to scouts and admins.
- **Player self-service profile edit** — Players can view their own dashboard but cannot edit any of their own data (position, nationality, biography). Add an edit flow that allows players to submit updates pending admin approval.
- **Scouting report PDF export** — Scouts can create and view reports but cannot export them. Add a `GET /scout/reports/{id}/export` endpoint that returns a PDF (using `reportlab` or `weasyprint`) and a download button in the reports UI.
- **Telegram webhook mode** — `bot.py` uses long-polling in a daemon thread. In production, switch to webhook mode (`setWebhook`) so the bot does not require an outbound polling connection and scales correctly behind a load balancer.
- **Background task queue** — The inactivity check in `tasks.py` runs in a plain daemon thread with `time.sleep(3600)`. Replace with APScheduler or Celery + Redis so tasks survive restarts, can be monitored, and support retries.
- **Per-notification mark-read** — The backend has `POST /notifications/read` which marks ALL notifications read and `DELETE /notifications` which clears all. There is no `PATCH /notifications/{id}/read` to mark a single notification read. The frontend renders `is_read` per row but cannot toggle it individually.
- **Real-time notifications** — The notification bell requires a page reload or navigation to `/dashboard/notifications` to update. Add a WebSocket or SSE endpoint (`GET /notifications/stream`) so the bell badge updates without polling.
- **Async email sending** — `forgot_password` in `auth.py` sends email synchronously in the request handler. A slow or unavailable SMTP server will block the request. Move to FastAPI `BackgroundTasks`.
- **Highlight moderation admin UI** — `PUT /highlights/{id}/status` exists in the backend for approving/rejecting player highlights. There is no admin page in the frontend; admins receive a notification with the URL but have no queue/list view to review pending highlights.
- **Admin broadcast notifications** — No way for a global admin to send a notification to all users or a specific role group. Add a `POST /admin/notifications/broadcast` endpoint and a UI to compose it.
- **HTTP caching on static assets** — Club and league logos served from `/static/logos/` have no `Cache-Control` headers. Configure `max-age` (e.g., 1 year with cache-busting filenames) to avoid re-downloading unchanged images on every request.
- **Image optimization** — Uploaded logos are stored as-is with no resizing or compression. Add thumbnail generation (e.g., via `Pillow`) at upload time and serve optimised versions to avoid transferring full-resolution images to every page load.
- **AI usage admin view** — There is no admin endpoint or UI to inspect `ai_usage_log` across all scouts, reset daily counters, or adjust per-user limits at runtime. Add `GET /admin/ai-usage` and surface it in the admin dashboard.
- **Player views analytics** — `PlayerView` rows are inserted on every scout view but are never queried for aggregated metrics. Add a `GET /admin/players/{id}/views` or trending-players endpoint and surface view counts to admins.
- **Admin analytics dashboard** — The global admin dashboard shows CRUD tables. Add a summary analytics view: total users by role, reports by status over time, most-viewed players, AI usage per scout.
