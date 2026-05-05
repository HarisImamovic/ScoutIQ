# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScoutIQ is a football scouting platform with role-based access for players, scouts, club admins, and global admins. It is a full-stack app: a React/TypeScript frontend and a FastAPI/Python backend backed by PostgreSQL.

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
```

**Backend** (`backend/.env`):

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/scoutiq
JWT_SECRET_KEY=<random 32+ char secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=http://localhost:8080
```

## Architecture

### Frontend (`frontend/src/`)

**Framework:** React 18 + TypeScript + Vite, styled with Tailwind CSS and Radix UI (shadcn/ui style).

**State management:**

- `AuthContext` — authentication state and session restoration
- `RoleContext` — role derived from auth state
- TanStack React Query — all server state (fetching/caching)
- React Hook Form + Zod — form state and validation

**Routing:** React Router v6. `App.tsx` defines all routes. `ProtectedRoute` enforces authentication; `RoleRoute` restricts by role. Role-based dashboard paths:

- `/dashboard/player` — players
- `/dashboard/scout` — scouts
- `/dashboard/club` — club admins
- `/dashboard/admin` — global admins

**API communication:** `src/api/client.ts` — a shared Axios instance that automatically injects the Bearer token and handles silent token refresh on 401. Concurrent requests during refresh are queued and replayed. On refresh failure, tokens are cleared and the user is redirected to login. Auth API methods live in `src/api/auth.ts`.

### Backend (`backend/app/`)

**Framework:** FastAPI with SQLAlchemy 2.0 ORM, Pydantic v2 schemas, and bcrypt + PyJWT authentication.

**Structure:**

- `main.py` — FastAPI app creation, CORS, router registration
- `routers/` — endpoint handlers (`auth.py`, `admin.py`)
- `models/` — SQLAlchemy ORM models (UUID PKs, timezone-aware timestamps)
- `schemas/` — Pydantic request/response models
- `security.py` — JWT creation/verification, password hashing
- `dependencies.py` — FastAPI `Depends()` helpers for auth and role enforcement
- `database.py` — SQLAlchemy engine and session setup
- `config.py` — pydantic-settings config from `.env`
- `limiter.py` — SlowAPI rate limiter (login: 10 req/min)
- `migrations/` — SQL migration and seed scripts

**Auth flow:** Access token (JWT, 15 min, stored in-memory on frontend) + refresh token (hashed in DB, 7 days, httpOnly cookie). All protected endpoints use `Depends(get_current_user)`. Admin endpoints additionally require `Depends(require_global_admin)`.

**API prefix:** All routes are under `/api/v1/`.

### User Roles

| Role           | Description                        |
| -------------- | ---------------------------------- |
| `player`       | Athletes being scouted             |
| `scout`        | Create and manage scouting reports |
| `club_admin`   | Club staff                         |
| `global_admin` | Full CRUD access via admin panel   |

### Testing

Frontend uses **Vitest** with `@testing-library/react`. Test files match `src/**/*.{test,spec}.{ts,tsx}`. Setup file: `src/test/setup.ts`.

Backend has no test framework configured.

## General rules

.claude and .env are not to be committed.
Best practices for Python and React are to be used, to ensure security and stability of the app.
No comments within the code.

## UI Conventions

- **Loading states**: Use `<Spinner>` from `@/components/ui/spinner` — wrap in `<div className="flex items-center justify-center h-64">`. Available sizes: `sm`, `md`, `lg`. For page-level spinners use `size="lg"` with a `label` prop (e.g. `label="Loading players…"`) — the label renders centered below the spinner. Inline spinners (e.g. inside buttons) omit the label.
- **Error states**: Use `<Alert variant="destructive">` from `@/components/ui/alert` with `<AlertCircle>` icon, `<AlertTitle>Error</AlertTitle>`, and `<AlertDescription>` — wrap in `<div className="flex items-center justify-center h-64">` with `max-w-md` on the alert.

## Jira Conventions

- **Understanding a ticket**: When you work on a ticket, make sure to thoroughly read the summary and the description. Each ticket will most definitely contain a detailed description. If it's a feature/task, it will contain all details on how and what needs to be implemented, on which files changes need to be made, which endpoints need to be created/managed, if migrations are needed etc. If it's a bug it will always contain detailed steps for replication of the bug, so you should try to replicate the bug before jumping into solving it.
- **Workflow**: After you are done with Understanding a ticket, you switch the status of the ticket from To Do to In Progress. Once you finish the ticket, move it to QA - To Do status, and from there I will take it.
