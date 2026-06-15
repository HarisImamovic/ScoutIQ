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
