# US Banking Dashboard — Design Spec
*Date: 2026-05-01*

## Overview

A personal finance dashboard for the US market. Users connect their bank accounts via Plaid, then see balances, transactions, spending analytics, and card summaries in a clean web UI. Deployed on Vercel. Live demo runs on Plaid Sandbox (no production approval required).

---

## Architecture

```
User Browser
    │
    ▼
Next.js 14 App Router (Vercel)
    ├── /app/(auth)/*          ← Clerk auth pages
    ├── /app/(dashboard)/*     ← Protected pages
    └── /app/api/plaid/*       ← Serverless API routes
            │
            ├── Plaid API (Sandbox)
            │       └── accounts, transactions, balances
            │
            ├── Neon (serverless Postgres)
            │       └── users → plaid_items (access_tokens)
            │
            └── Clerk
                    └── session / user identity
```

### Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router + TypeScript | Vercel-native, API routes as serverless functions |
| Auth | Clerk | Simple middleware integration, hosted UI |
| Banking data | Plaid Node SDK (Sandbox) | Industry standard, 12,000+ US banks, free sandbox |
| Database | Neon + Drizzle ORM | Serverless Postgres, scales to zero, Vercel-compatible |
| UI components | shadcn/ui + Tailwind CSS | Composable, accessible, no runtime overhead |
| Charts | Recharts | React-native, composable, lightweight |
| Deploy | Vercel | Zero-config Next.js deployment |

---

## Pages

### Public

| Route | Description |
|---|---|
| `/` | Landing page: hero section, 3 feature highlights, CTA "Get Started" |
| `/sign-in` | Clerk-hosted sign-in |
| `/sign-up` | Clerk-hosted sign-up |

### Dashboard (requires auth + connected bank)

| Route | Description |
|---|---|
| `/dashboard` | Overview: total balance, last 5 transactions, spending donut chart, net worth card |
| `/dashboard/accounts` | All accounts (checking, savings, credit) with current balances |
| `/dashboard/transactions` | Full transaction list — filter by date, category, account; search by merchant |
| `/dashboard/analytics` | Spending by category (bar chart), monthly trend (line chart), top 5 merchants |
| `/dashboard/cards` | Credit/debit cards, credit limits, outstanding balances |
| `/dashboard/connect` | Plaid Link widget — shown when no bank is connected |

### Navigation

- Desktop: collapsible sidebar with icons + labels
- Mobile: bottom navigation bar

---

## Data Flow

1. User signs up / logs in via Clerk
2. Middleware redirects unauthenticated users to `/sign-in`
3. If no bank connected → redirect to `/dashboard/connect`
4. User clicks "Connect Bank" → `POST /api/plaid/link-token` creates a link token
5. Plaid Link widget opens in browser
6. User enters sandbox credentials (`user_good` / `pass_good`)
7. Browser sends `public_token` → `POST /api/plaid/exchange-token`
8. Server exchanges token, saves `access_token` + `item_id` to Neon
9. Dashboard pages fetch data via API routes → Plaid API → rendered in UI

---

## Database Schema

```sql
-- Drizzle ORM schema

users
  id          text PRIMARY KEY  -- Clerk user_id (e.g. "user_2abc...")
  email       text NOT NULL
  created_at  timestamp DEFAULT now()

plaid_items
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id          text NOT NULL REFERENCES users(id)
  access_token     text NOT NULL  -- stored server-side only, never sent to client
  item_id          text NOT NULL
  institution_id   text
  institution_name text
  created_at       timestamp DEFAULT now()
```

---

## API Routes

All routes under `/app/api/plaid/`. Every route validates Clerk session via `auth()` before executing.

| Route | Method | Request | Response |
|---|---|---|---|
| `/api/plaid/link-token` | POST | — | `{ link_token }` |
| `/api/plaid/exchange-token` | POST | `{ public_token, institution }` | `{ success }` |
| `/api/plaid/accounts` | GET | — | `Account[]` |
| `/api/plaid/transactions` | GET | `?start&end&account_id` | `Transaction[]` |
| `/api/plaid/identity` | GET | — | `{ name, email }` |

---

## Security

- All `/api/plaid/*` routes call `auth()` from `@clerk/nextjs/server` — unauthenticated requests return 401
- `access_token` lives only in Neon, never exposed to the client
- Clerk middleware configured in `middleware.ts` to protect all `/dashboard/*` routes
- Environment variables: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `DATABASE_URL`, `CLERK_SECRET_KEY` — stored in Vercel environment variables, never committed

---

## Environment Variables

```
# Plaid
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
NEXT_PUBLIC_PLAID_ENV=sandbox

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/connect

# Neon
DATABASE_URL=
```

---

## Out of Scope (v1)

- Multiple connected banks per user (v1 supports one item per user)
- Budget goals / alerts
- Bill pay or any write operations
- Mobile app
- Production Plaid approval (sandbox only for demo)
