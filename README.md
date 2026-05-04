<div align="center">

# FinanceFlow

**Personal finance dashboard that connects your bank accounts in one place.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![codecov](https://codecov.io/gh/ivannavi334/bankingapp/graph/badge.svg)](https://codecov.io/gh/ivannavi334/bankingapp)

[Live Demo](https://banking-pi-blond.vercel.app) · [Report Bug](https://github.com/ivannavi334/bankingapp/issues/new?template=bug_report.md) · [Request Feature](https://github.com/ivannavi334/bankingapp/issues/new?template=feature_request.md)

![Dashboard Overview](docs/screenshots/dashboard-overview.png)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running Locally](#running-locally)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

FinanceFlow aggregates data from all your US bank accounts via [Plaid](https://plaid.com/) and presents it in a clean, unified dashboard. Track spending trends, review transactions, monitor credit utilization, and understand where your money goes — without leaving a single page.

---

## Screenshots

| Dashboard | Transactions |
|-----------|-------------|
| ![Dashboard](docs/screenshots/dashboard-overview.png) | ![Transactions](docs/screenshots/transactions.png) |

| Analytics | Cards |
|-----------|-------|
| ![Analytics](docs/screenshots/analytics.png) | ![Cards](docs/screenshots/cards.png) |

| Accounts | Connect Bank |
|----------|-------------|
| ![Accounts](docs/screenshots/accounts.png) | ![Connect](docs/screenshots/connect-bank.png) |

---

## Features

- **Multi-account aggregation** — connect multiple US bank accounts through a single Plaid Link flow
- **90-day transaction history** — browse, filter, and categorize every transaction
- **Spending analytics** — monthly trends bar chart, category breakdown pie chart, and top merchants table
- **Card management** — visual credit card display with real-time utilization tracking
- **Secure authentication** — powered by Clerk with protected routes and session management
- **Responsive design** — fully functional on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS, shadcn/ui |
| Auth | [Clerk](https://clerk.com/) |
| Banking API | [Plaid](https://plaid.com/) |
| Database | PostgreSQL via [Neon](https://neon.tech/) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Charts | [Recharts](https://recharts.org/) |
| Deployment | [Vercel](https://vercel.com/) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A [Clerk](https://clerk.com/) account
- A [Plaid](https://dashboard.plaid.com/) account (sandbox is free)
- A [Neon](https://neon.tech/) PostgreSQL database

### Installation

```bash
git clone https://github.com/ivannavi334/banking.git
cd banking
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Plaid
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_sandbox_secret
PLAID_ENV=sandbox

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

> **Note:** Never commit `.env.local` to version control.

### Database Setup

Run migrations to create the required tables:

```bash
npm run db:push
```

To open Drizzle Studio (database GUI):

```bash
npm run db:studio
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Plaid sandbox test credentials:**

When prompted by Plaid Link, use any US institution (e.g. Chase), enter any username/password, and verify with phone code `123456`.

---

## Project Structure

```
├── app/
│   ├── (auth)/              # Sign-in / Sign-up pages
│   ├── (dashboard)/         # Protected dashboard routes
│   │   └── dashboard/
│   │       ├── page.tsx     # Overview
│   │       ├── accounts/    # Connected accounts
│   │       ├── transactions/# Transaction history
│   │       ├── analytics/   # Charts & insights
│   │       ├── cards/       # Credit cards
│   │       └── connect/     # Add a bank account
│   └── api/plaid/           # Plaid token exchange endpoints
├── components/
│   ├── dashboard/           # Chart components
│   ├── layout/              # Sidebar, mobile nav
│   ├── plaid/               # Plaid Link button
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── actions.ts           # Server actions
│   ├── plaid.ts             # Plaid client
│   ├── utils.ts             # Formatting helpers
│   └── db/                  # Drizzle schema & client
├── docs/
│   └── screenshots/         # README images
└── middleware.ts             # Clerk route protection
```

---

## Deployment

The app is configured for zero-config deployment on Vercel.

1. Push the repository to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Add all environment variables from `.env.local` in the Vercel dashboard
4. Deploy

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
