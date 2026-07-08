# ScoutIQ

**AI-powered football scouting platform** — discover, evaluate, and track talent with data-driven insights.

[![Live](https://img.shields.io/website?url=https%3A%2F%2Fscoutiq.tech&label=scoutiq.tech&up_message=live&up_color=10b981&down_message=down&down_color=ef4444)](https://scoutiq.tech)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

## Live Application

**[https://scoutiq.tech](https://scoutiq.tech)**

Deployed entirely on free-tier infrastructure — Render (API), Cloudflare Pages (frontend), Neon (Postgres), Cloudflare (DNS), Resend (email), and UptimeRobot (monitoring). See [Architecture & Deployment](#architecture--deployment) below for how it's wired together.

## What is ScoutIQ?

ScoutIQ is a full-stack scouting platform built for football (soccer) organizations, connecting four distinct roles around a shared pool of player data:

- **Scouts** browse players, save prospects, write structured scouting reports, and consult an AI assistant for data-driven comparisons and recommendations.
- **Club admins** manage their club's players, contracts, and salaries, and review scouting reports written about their squad.
- **Players** maintain their own profile and highlight reel.
- **Global admins** get full CRUD control across users, clubs, leagues, players, and reports platform-wide.

Every role gets its own dashboard, and access is strictly enforced by role on both the frontend and backend — a player can never reach admin routes, and vice versa.

## Key Features

| Area | Highlights |
|---|---|
| **Auth & Security** | JWT access/refresh tokens, mandatory 2FA (TOTP, email, or SMS) after first login, recovery codes, Google OAuth SSO, account lockout on repeated failed logins |
| **AI Assistant** | Streaming chat (Groq) grounded in live player/report/prospect data, with per-user and platform-wide daily usage caps |
| **Scouting Reports** | Structured reports with ratings, statuses, and approval workflow |
| **Telegram Notifications** | Scouts can link their Telegram account to get notified when their reports are updated |
| **Player Data** | Stats, market value history, contracts, availability status, highlight videos |
| **Admin Tools** | Full CRUD over users, clubs, leagues, and players; CSV bulk import; AI-access grants |

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS, Radix UI (shadcn/ui) |
| Server state | TanStack React Query |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 |
| Testing | Vitest, Playwright (E2E) |

### Backend
| | |
|---|---|
| Framework | FastAPI (Python) |
| ORM | SQLAlchemy 2.0 |
| Validation | Pydantic v2 |
| Auth | JWT (PyJWT) + bcrypt, TOTP (pyotp), Fernet-encrypted secrets |
| Rate limiting | SlowAPI |
| Database | PostgreSQL |

### Integrations
| | |
|---|---|
| AI | Groq API (`openai/gpt-oss-120b`) |
| Notifications | Telegram Bot API (webhook mode in production) |
| Email | Resend (transactional: password reset, 2FA codes) |
| SMS 2FA | Twilio (optional) |
| OAuth | Google Sign-In (PKCE flow) |

## Architecture & Deployment

```
Browser
  │
  ├── https://scoutiq.tech        →  Cloudflare Pages (React/Vite static build)
  │
  └── https://api.scoutiq.tech    →  Cloudflare (DNS only) → Render (FastAPI)
                                          → Neon (managed Postgres)
                                          → Groq API (AI chat)
                                          → Telegram Bot API (webhook)
                                          → Resend (transactional email)

UptimeRobot → pings /api/health every 5 min to keep the free Render instance warm
```

All infrastructure runs on free tiers, with no credit card required anywhere in the stack.

## Local Development

### Frontend
```bash
cd frontend
npm run dev        # http://localhost:8080
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload   # http://localhost:8000
```

See `backend/.env.example` for the full list of required environment variables.
