# US Banking Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build FinanceFlow — a personal finance dashboard for the US market where users connect bank accounts via Plaid Sandbox, then view balances, transactions, spending analytics, and card summaries.

**Architecture:** Next.js 14 App Router. Server components fetch data directly from Plaid/DB via `lib/actions.ts`. Two API routes handle client-side Plaid token exchange. Clerk middleware protects all `/dashboard/*` routes. Plaid `access_token` is stored in Neon Postgres and never sent to the browser.

**Tech Stack:** Next.js 14, TypeScript, Clerk v5, Plaid Node SDK v27, Neon + Drizzle ORM, shadcn/ui, Tailwind CSS, Recharts, Vitest

---

## File Map

```
app/
  (auth)/
    sign-in/[[...sign-in]]/page.tsx   ← Clerk sign-in page
    sign-up/[[...sign-up]]/page.tsx   ← Clerk sign-up page
  (dashboard)/
    layout.tsx                         ← Sidebar + auth guard
    dashboard/
      page.tsx                         ← Overview
      accounts/page.tsx
      transactions/page.tsx
      analytics/page.tsx
      cards/page.tsx
      connect/page.tsx                 ← Plaid Link entry
  api/plaid/
    link-token/route.ts                ← POST: create link token
    exchange-token/route.ts            ← POST: swap public_token → access_token
  globals.css
  layout.tsx                           ← Root layout with ClerkProvider
  page.tsx                             ← Landing page

components/
  layout/
    sidebar.tsx                        ← Desktop collapsible sidebar
    mobile-nav.tsx                     ← Mobile bottom nav
  dashboard/
    overview-cards.tsx                 ← Total balance + stats cards
    recent-transactions.tsx            ← Last 5 transactions list
    spending-donut.tsx                 ← Recharts donut by category
  transactions/
    transaction-table.tsx              ← Full table with search/filter
    transaction-filters.tsx            ← Date/category/account filters
  analytics/
    spending-bar-chart.tsx             ← Spending by category bar chart
    monthly-trend-chart.tsx            ← Monthly spend line chart
    top-merchants.tsx                  ← Top 5 merchants list
  plaid/
    plaid-link-button.tsx              ← Client component, opens Plaid Link

lib/
  plaid.ts                             ← PlaidApi singleton
  actions.ts                           ← Server-side data fetching helpers
  db/
    index.ts                           ← Drizzle + Neon client
    schema.ts                          ← users + plaid_items tables
  utils.ts                             ← cn, formatCurrency, groupByCategory, getMonthlyTotals

middleware.ts                          ← Clerk route protection
drizzle.config.ts
vitest.config.ts
vitest.setup.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via CLI)
- Create: `.env.local`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd C:/projects/banking
npx create-next-app@14 . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

When prompted, accept all defaults.

- [ ] **Step 2: Install project dependencies**

```bash
npm install @clerk/nextjs plaid react-plaid-link drizzle-orm @neondatabase/serverless recharts date-fns clsx tailwind-merge lucide-react
npm install -D drizzle-kit vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Create `.env.local`**

```bash
cat > .env.local << 'EOF'
# Plaid
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/connect

# Neon
DATABASE_URL=your_neon_connection_string

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 5: Create `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to `package.json`**

Open `package.json` and add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts at `http://localhost:3000`

- [ ] **Step 8: Commit**

```bash
git init
git add package.json package-lock.json next.config.ts tailwind.config.ts tsconfig.json vitest.config.ts vitest.setup.ts .gitignore
git commit -m "init: scaffold Next.js 14 project with dependencies"
```

---

## Task 2: Drizzle Schema + Neon Connection

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`
- Create: `lib/db/__tests__/schema.test.ts`

- [ ] **Step 1: Write schema test first**

```typescript
// lib/db/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest'
import { users, plaidItems } from '../schema'

describe('database schema', () => {
  it('users table has required columns', () => {
    const columns = Object.keys(users)
    expect(columns).toContain('id')
    expect(columns).toContain('email')
    expect(columns).toContain('createdAt')
  })

  it('plaidItems table has required columns', () => {
    const columns = Object.keys(plaidItems)
    expect(columns).toContain('id')
    expect(columns).toContain('userId')
    expect(columns).toContain('accessToken')
    expect(columns).toContain('itemId')
    expect(columns).toContain('institutionName')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run lib/db/__tests__/schema.test.ts
```

Expected: FAIL — "Cannot find module '../schema'"

- [ ] **Step 3: Create `lib/db/schema.ts`**

```typescript
import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const plaidItems = pgTable('plaid_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id),
  accessToken: text('access_token').notNull(),
  itemId: text('item_id').notNull(),
  institutionId: text('institution_id'),
  institutionName: text('institution_name'),
  createdAt: timestamp('created_at').defaultNow(),
})

export type User = typeof users.$inferSelect
export type PlaidItem = typeof plaidItems.$inferSelect
export type NewUser = typeof users.$inferInsert
export type NewPlaidItem = typeof plaidItems.$inferInsert
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run lib/db/__tests__/schema.test.ts
```

Expected: PASS

- [ ] **Step 5: Create `lib/db/index.ts`**

```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

- [ ] **Step 6: Create `drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config
```

- [ ] **Step 7: Add migration scripts to `package.json`**

Add to `"scripts"`:
```json
"db:generate": "drizzle-kit generate:pg",
"db:push": "drizzle-kit push:pg"
```

- [ ] **Step 8: Push schema to Neon** (requires `DATABASE_URL` in `.env.local`)

```bash
npm run db:push
```

Expected: `Your schema is ready`

- [ ] **Step 9: Commit**

```bash
git add lib/db/ drizzle.config.ts
git commit -m "feat: add Drizzle schema and Neon connection"
```

---

## Task 3: Utility Functions

**Files:**
- Create: `lib/utils.ts`
- Create: `lib/__tests__/utils.test.ts`

- [ ] **Step 1: Write tests first**

```typescript
// lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, groupByCategory, getMonthlyTotals } from '../utils'

describe('formatCurrency', () => {
  it('formats positive USD amount', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats negative amount', () => {
    expect(formatCurrency(-50)).toBe('-$50.00')
  })
})

describe('formatDate', () => {
  it('formats ISO date string to readable format', () => {
    expect(formatDate('2024-01-15')).toBe('Jan 15, 2024')
  })
})

describe('groupByCategory', () => {
  it('sums amounts by category', () => {
    const transactions = [
      { personal_finance_category: { primary: 'FOOD_AND_DRINK' }, amount: 25.00 },
      { personal_finance_category: { primary: 'FOOD_AND_DRINK' }, amount: 15.00 },
      { personal_finance_category: { primary: 'TRANSPORTATION' }, amount: 40.00 },
    ] as any[]

    const result = groupByCategory(transactions)
    expect(result['FOOD_AND_DRINK']).toBe(40)
    expect(result['TRANSPORTATION']).toBe(40)
  })

  it('uses Other for missing category', () => {
    const transactions = [
      { personal_finance_category: null, amount: 10 },
    ] as any[]
    expect(groupByCategory(transactions)['Other']).toBe(10)
  })
})

describe('getMonthlyTotals', () => {
  it('groups positive amounts by month', () => {
    const transactions = [
      { date: '2024-01-10', amount: 100 },
      { date: '2024-01-20', amount: 50 },
      { date: '2024-02-05', amount: 200 },
    ] as any[]

    const result = getMonthlyTotals(transactions)
    expect(result).toHaveLength(2)
    expect(result[0].amount).toBe(150)
    expect(result[1].amount).toBe(200)
  })

  it('skips negative amounts (income/refunds)', () => {
    const transactions = [
      { date: '2024-01-10', amount: -500 },
      { date: '2024-01-15', amount: 100 },
    ] as any[]

    const result = getMonthlyTotals(transactions)
    expect(result[0].amount).toBe(100)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run lib/__tests__/utils.test.ts
```

Expected: FAIL — "Cannot find module '../utils'"

- [ ] **Step 3: Create `lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Transaction } from 'plaid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function groupByCategory(transactions: Transaction[]): Record<string, number> {
  return transactions.reduce((acc, t) => {
    const category = t.personal_finance_category?.primary ?? 'Other'
    acc[category] = (acc[category] ?? 0) + Math.abs(t.amount)
    return acc
  }, {} as Record<string, number>)
}

export function getMonthlyTotals(
  transactions: Transaction[],
): { month: string; amount: number }[] {
  const monthly: Record<string, number> = {}
  for (const t of transactions) {
    if (t.amount <= 0) continue
    const key = t.date.slice(0, 7)
    monthly[key] = (monthly[key] ?? 0) + t.amount
  }
  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({
      month: new Date(key + '-01T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      }),
      amount: Math.round(amount * 100) / 100,
    }))
}

export function getTopMerchants(
  transactions: Transaction[],
  limit = 5,
): { name: string; amount: number; count: number }[] {
  const merchants: Record<string, { amount: number; count: number }> = {}
  for (const t of transactions) {
    if (t.amount <= 0) continue
    const name = t.merchant_name ?? t.name
    if (!merchants[name]) merchants[name] = { amount: 0, count: 0 }
    merchants[name].amount += t.amount
    merchants[name].count += 1
  }
  return Object.entries(merchants)
    .map(([name, data]) => ({
      name,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run lib/__tests__/utils.test.ts
```

Expected: PASS (4 test suites, all green)

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts lib/__tests__/
git commit -m "feat: add utility functions with tests"
```

---

## Task 4: Plaid Client + Server Actions

**Files:**
- Create: `lib/plaid.ts`
- Create: `lib/actions.ts`

- [ ] **Step 1: Create `lib/plaid.ts`**

```typescript
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments ?? 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)
```

- [ ] **Step 2: Create `lib/actions.ts`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { plaidItems, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { plaidClient } from '@/lib/plaid'
import { Products, CountryCode } from 'plaid'
import { subDays, format } from 'date-fns'

export async function getPlaidItem(userId: string) {
  const items = await db.select().from(plaidItems).where(eq(plaidItems.userId, userId))
  return items[0] ?? null
}

export async function ensureUser(userId: string, email: string) {
  await db
    .insert(users)
    .values({ id: userId, email })
    .onConflictDoNothing()
}

export async function createLinkToken(userId: string) {
  const res = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'FinanceFlow',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
  })
  return res.data.link_token
}

export async function getAccounts(accessToken: string) {
  const res = await plaidClient.accountsGet({ access_token: accessToken })
  return res.data.accounts
}

export async function getTransactions(
  accessToken: string,
  days = 30,
) {
  const endDate = format(new Date(), 'yyyy-MM-dd')
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')
  const res = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: { count: 500 },
  })
  return res.data.transactions
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/plaid.ts lib/actions.ts
git commit -m "feat: add Plaid client and server data fetching helpers"
```

---

## Task 5: Clerk Auth Setup

**Files:**
- Create: `middleware.ts`
- Modify: `app/layout.tsx`
- Create: `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Create: `app/(auth)/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Create `middleware.ts`**

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

- [ ] **Step 2: Update `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FinanceFlow',
  description: 'Your personal US banking dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 3: Create sign-in page**

```typescript
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignIn />
    </div>
  )
}
```

- [ ] **Step 4: Create sign-up page**

```typescript
// app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignUp />
    </div>
  )
}
```

- [ ] **Step 5: Verify auth works**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard` — should redirect to `/sign-in`.

- [ ] **Step 6: Commit**

```bash
git add middleware.ts app/layout.tsx app/(auth)/
git commit -m "feat: add Clerk authentication and route protection"
```

---

## Task 6: shadcn/ui Setup

**Files:**
- Create: `components/ui/*` (via CLI)

- [ ] **Step 1: Initialize shadcn/ui**

```bash
npx shadcn-ui@latest init
```

When prompted:
- Style: `Default`
- Base color: `Slate`
- CSS variables: `Yes`

- [ ] **Step 2: Install required components**

```bash
npx shadcn-ui@latest add button card badge input select table separator skeleton avatar dropdown-menu sheet scroll-area progress
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/ lib/utils.ts app/globals.css components.json tailwind.config.ts
git commit -m "feat: add shadcn/ui component library"
```

---

## Task 7: API Routes (Plaid Token Exchange)

**Files:**
- Create: `app/api/plaid/link-token/route.ts`
- Create: `app/api/plaid/exchange-token/route.ts`

- [ ] **Step 1: Create `app/api/plaid/link-token/route.ts`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createLinkToken } from '@/lib/actions'

export async function POST() {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const linkToken = await createLinkToken(userId)
    return NextResponse.json({ link_token: linkToken })
  } catch (error) {
    console.error('[link-token]', error)
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/plaid/exchange-token/route.ts`**

```typescript
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { db } from '@/lib/db'
import { plaidItems, users } from '@/lib/db/schema'
import { ensureUser } from '@/lib/actions'

interface ExchangeBody {
  public_token: string
  institution: { name: string; institution_id: string }
}

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { public_token, institution }: ExchangeBody = await req.json()

  try {
    const user = await currentUser()
    await ensureUser(userId, user?.emailAddresses[0]?.emailAddress ?? '')

    const res = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = res.data

    await db.insert(plaidItems).values({
      userId,
      accessToken: access_token,
      itemId: item_id,
      institutionId: institution.institution_id,
      institutionName: institution.name,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[exchange-token]', error)
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/
git commit -m "feat: add Plaid link-token and exchange-token API routes"
```

---

## Task 8: Plaid Link Button + Connect Page

**Files:**
- Create: `components/plaid/plaid-link-button.tsx`
- Create: `app/(dashboard)/dashboard/connect/page.tsx`

- [ ] **Step 1: Create `components/plaid/plaid-link-button.tsx`**

```typescript
'use client'

import { useCallback, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface PlaidLinkButtonProps {
  linkToken: string
}

export function PlaidLinkButton({ linkToken }: PlaidLinkButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onSuccess = useCallback(
    async (
      publicToken: string,
      metadata: { institution: { name: string; institution_id: string } },
    ) => {
      setLoading(true)
      await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token: publicToken,
          institution: metadata.institution,
        }),
      })
      router.push('/dashboard')
      router.refresh()
    },
    [router],
  )

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess })

  return (
    <Button
      size="lg"
      onClick={() => open()}
      disabled={!ready || loading}
      className="gap-2"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? 'Connecting...' : 'Connect Bank Account'}
    </Button>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/dashboard/connect/page.tsx`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createLinkToken, getPlaidItem } from '@/lib/actions'
import { PlaidLinkButton } from '@/components/plaid/plaid-link-button'
import { Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ConnectPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const existing = await getPlaidItem(userId)
  if (existing) redirect('/dashboard')

  const linkToken = await createLinkToken(userId)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Building2 className="h-7 w-7 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Connect Your Bank</CardTitle>
          <CardDescription>
            Securely link your bank account to get started. Use{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">user_good</code> /{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">pass_good</code> for the demo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <PlaidLinkButton linkToken={linkToken} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Test connect flow**

```bash
npm run dev
```

1. Sign up at `/sign-up`
2. Should redirect to `/dashboard/connect`
3. Click "Connect Bank Account"
4. Plaid Link opens — select any bank, use `user_good` / `pass_good`
5. Should redirect to `/dashboard`

- [ ] **Step 4: Commit**

```bash
git add components/plaid/ app/(dashboard)/dashboard/connect/
git commit -m "feat: add Plaid Link button and bank connect page"
```

---

## Task 9: Dashboard Layout (Sidebar + Mobile Nav)

**Files:**
- Create: `components/layout/sidebar.tsx`
- Create: `components/layout/mobile-nav.tsx`
- Create: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create `components/layout/sidebar.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/accounts', label: 'Accounts', icon: Wallet },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/cards', label: 'Cards', icon: CreditCard },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && (
          <span className="font-bold text-lg text-blue-600">FinanceFlow</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto rounded-md p-1.5 hover:bg-gray-100"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      <div className={cn('border-t p-4', collapsed && 'flex justify-center')}>
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create `components/layout/mobile-nav.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  CreditCard,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/accounts', label: 'Accounts', icon: Wallet },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/cards', label: 'Cards', icon: CreditCard },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white z-50">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium',
              pathname === href ? 'text-blue-600' : 'text-gray-500',
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/layout.tsx`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem } from '@/lib/actions'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  const isConnectPage = false // connect page handles its own redirect

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/ app/(dashboard)/layout.tsx
git commit -m "feat: add dashboard layout with sidebar and mobile nav"
```

---

## Task 10: Landing Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BarChart3, Shield, Zap } from 'lucide-react'

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Spending Analytics',
    description: 'Visualize where your money goes with interactive charts and category breakdowns.',
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Your credentials are never stored. We use Plaid for secure read-only bank access.',
  },
  {
    icon: Zap,
    title: 'Real-Time Balances',
    description: 'See all your accounts, balances, and recent transactions in one place.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-4">
          <span className="font-bold text-xl text-blue-600">FinanceFlow</span>
          <div className="flex gap-3">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Your finances,{' '}
          <span className="text-blue-600">crystal clear</span>
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
          Connect your US bank accounts and get a complete picture of your spending,
          balances, and financial health — all in one dashboard.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/sign-up">Get Started Free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 mb-4">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} FinanceFlow. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add landing page"
```

---

## Task 11: Overview Dashboard Page

**Files:**
- Create: `components/dashboard/overview-cards.tsx`
- Create: `components/dashboard/recent-transactions.tsx`
- Create: `components/dashboard/spending-donut.tsx`
- Create: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create `components/dashboard/overview-cards.tsx`**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import type { AccountBase, Transaction } from 'plaid'

interface OverviewCardsProps {
  accounts: AccountBase[]
  transactions: Transaction[]
}

export function OverviewCards({ accounts, transactions }: OverviewCardsProps) {
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balances.current ?? 0), 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthlyTx = transactions.filter((t) => t.date.startsWith(thisMonth))
  const spent = monthlyTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const income = monthlyTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Balance</CardTitle>
          <Wallet className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
          <p className="text-xs text-gray-500 mt-1">Across {accounts.length} accounts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Monthly Spending</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(spent)}</div>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Monthly Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(income)}</div>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/dashboard/recent-transactions.tsx`**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from 'plaid'
import Link from 'next/link'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recent = transactions.slice(0, 5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
        <Link href="/dashboard/transactions" className="text-sm text-blue-600 hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recent.map((t) => (
            <div key={t.transaction_id} className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{t.merchant_name ?? t.name}</span>
                <span className="text-xs text-gray-500">{formatDate(t.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                  {t.personal_finance_category?.primary?.replace(/_/g, ' ') ?? 'Other'}
                </Badge>
                <span
                  className={`text-sm font-semibold ${t.amount > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {t.amount > 0 ? '-' : '+'}{formatCurrency(Math.abs(t.amount))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create `components/dashboard/spending-donut.tsx`**

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

interface SpendingDonutProps {
  data: { category: string; amount: number }[]
}

export function SpendingDonut({ data }: SpendingDonutProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="amount"
              nameKey="category"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend
              formatter={(value) => value.replace(/_/g, ' ')}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create `app/(dashboard)/dashboard/page.tsx`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem, getAccounts, getTransactions } from '@/lib/actions'
import { groupByCategory } from '@/lib/utils'
import { OverviewCards } from '@/components/dashboard/overview-cards'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { SpendingDonut } from '@/components/dashboard/spending-donut'

export default async function DashboardPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  if (!item) redirect('/dashboard/connect')

  const [accounts, transactions] = await Promise.all([
    getAccounts(item.accessToken),
    getTransactions(item.accessToken, 30),
  ])

  const categoryMap = groupByCategory(transactions)
  const categoryData = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <OverviewCards accounts={accounts} transactions={transactions} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions transactions={transactions} />
        <SpendingDonut data={categoryData} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/ app/(dashboard)/dashboard/page.tsx
git commit -m "feat: add overview dashboard page with cards and charts"
```

---

## Task 12: Accounts Page

**Files:**
- Create: `app/(dashboard)/dashboard/accounts/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/dashboard/accounts/page.tsx`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem, getAccounts } from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2 } from 'lucide-react'
import type { AccountBase } from 'plaid'

const ACCOUNT_COLORS: Record<string, string> = {
  depository: 'bg-blue-100 text-blue-700',
  credit: 'bg-purple-100 text-purple-700',
  loan: 'bg-orange-100 text-orange-700',
  investment: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-700',
}

function AccountCard({ account }: { account: AccountBase }) {
  const colorClass = ACCOUNT_COLORS[account.type] ?? ACCOUNT_COLORS.other
  const balance = account.balances.current ?? account.balances.available ?? 0
  const isCredit = account.type === 'credit'
  const limit = account.balances.limit

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <Building2 className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-base">{account.name}</CardTitle>
            <p className="text-xs text-gray-500">••••{account.mask}</p>
          </div>
        </div>
        <Badge className={colorClass} variant="secondary">
          {account.subtype ?? account.type}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(balance)}
        </div>
        {isCredit && limit && (
          <p className="text-xs text-gray-500 mt-1">
            Limit: {formatCurrency(limit)} · Available: {formatCurrency(limit - balance)}
          </p>
        )}
        {!isCredit && account.balances.available != null && (
          <p className="text-xs text-gray-500 mt-1">
            Available: {formatCurrency(account.balances.available)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default async function AccountsPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  if (!item) redirect('/dashboard/connect')

  const accounts = await getAccounts(item.accessToken)

  const totalBalance = accounts
    .filter((a) => a.type !== 'credit')
    .reduce((sum, a) => sum + (a.balances.current ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <div className="text-sm text-gray-500">
          Net balance: <span className="font-semibold text-gray-900">{formatCurrency(totalBalance)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <AccountCard key={account.account_id} account={account} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/dashboard/accounts/
git commit -m "feat: add accounts page"
```

---

## Task 13: Transactions Page

**Files:**
- Create: `components/transactions/transaction-table.tsx`
- Create: `app/(dashboard)/dashboard/transactions/page.tsx`

- [ ] **Step 1: Create `components/transactions/transaction-table.tsx`**

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search } from 'lucide-react'
import type { Transaction, AccountBase } from 'plaid'

interface TransactionTableProps {
  transactions: Transaction[]
  accounts: AccountBase[]
}

export function TransactionTable({ transactions, accounts }: TransactionTableProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')

  const categories = useMemo(() => {
    const cats = new Set(
      transactions.map((t) => t.personal_finance_category?.primary ?? 'Other'),
    )
    return Array.from(cats).sort()
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const name = (t.merchant_name ?? t.name).toLowerCase()
      const matchSearch = name.includes(search.toLowerCase())
      const matchCategory =
        categoryFilter === 'all' ||
        (t.personal_finance_category?.primary ?? 'Other') === categoryFilter
      const matchAccount = accountFilter === 'all' || t.account_id === accountFilter
      return matchSearch && matchCategory && matchAccount
    })
  }, [transactions, search, categoryFilter, accountFilter])

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.account_id, a.name])),
    [accounts],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.account_id} value={a.account_id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-gray-500">{filtered.length} transactions</div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="divide-y">
          {filtered.map((t) => (
            <div
              key={t.transaction_id}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  {t.merchant_name ?? t.name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{formatDate(t.date)}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{accountMap[t.account_id]}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                  {(t.personal_finance_category?.primary ?? 'Other').replace(/_/g, ' ')}
                </Badge>
                <span
                  className={`text-sm font-semibold whitespace-nowrap ${
                    t.amount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {t.amount > 0 ? '-' : '+'}{formatCurrency(Math.abs(t.amount))}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500">
              No transactions match your filters
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/dashboard/transactions/page.tsx`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem, getAccounts, getTransactions } from '@/lib/actions'
import { TransactionTable } from '@/components/transactions/transaction-table'

export default async function TransactionsPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  if (!item) redirect('/dashboard/connect')

  const [accounts, transactions] = await Promise.all([
    getAccounts(item.accessToken),
    getTransactions(item.accessToken, 90),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <TransactionTable transactions={transactions} accounts={accounts} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/transactions/ app/(dashboard)/dashboard/transactions/
git commit -m "feat: add transactions page with search and filters"
```

---

## Task 14: Analytics Page

**Files:**
- Create: `components/analytics/spending-bar-chart.tsx`
- Create: `components/analytics/monthly-trend-chart.tsx`
- Create: `components/analytics/top-merchants.tsx`
- Create: `app/(dashboard)/dashboard/analytics/page.tsx`

- [ ] **Step 1: Create `components/analytics/spending-bar-chart.tsx`**

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

interface SpendingBarChartProps {
  data: { category: string; amount: number }[]
}

export function SpendingBarChart({ data }: SpendingBarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fontSize: 11 }}
              width={140}
              tickFormatter={(v) => v.replace(/_/g, ' ')}
            />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `components/analytics/monthly-trend-chart.tsx`**

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface MonthlyTrendChartProps {
  data: { month: string; amount: number }[]
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Spending Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create `components/analytics/top-merchants.tsx`**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface TopMerchantsProps {
  merchants: { name: string; amount: number; count: number }[]
}

export function TopMerchants({ merchants }: TopMerchantsProps) {
  const max = merchants[0]?.amount ?? 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Merchants</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {merchants.map(({ name, amount, count }, i) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
                  <span className="text-xs text-gray-500 ml-1">({count}×)</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${(amount / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create `app/(dashboard)/dashboard/analytics/page.tsx`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem, getTransactions } from '@/lib/actions'
import { groupByCategory, getMonthlyTotals, getTopMerchants } from '@/lib/utils'
import { SpendingBarChart } from '@/components/analytics/spending-bar-chart'
import { MonthlyTrendChart } from '@/components/analytics/monthly-trend-chart'
import { TopMerchants } from '@/components/analytics/top-merchants'

export default async function AnalyticsPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  if (!item) redirect('/dashboard/connect')

  const transactions = await getTransactions(item.accessToken, 90)

  const categoryMap = groupByCategory(transactions)
  const categoryData = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const monthlyData = getMonthlyTotals(transactions)
  const topMerchants = getTopMerchants(transactions, 5)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingBarChart data={categoryData} />
        <TopMerchants merchants={topMerchants} />
      </div>
      <MonthlyTrendChart data={monthlyData} />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/analytics/ app/(dashboard)/dashboard/analytics/
git commit -m "feat: add analytics page with bar chart, trend line, and top merchants"
```

---

## Task 15: Cards Page

**Files:**
- Create: `app/(dashboard)/dashboard/cards/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/dashboard/cards/page.tsx`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem, getAccounts } from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard } from 'lucide-react'
import type { AccountBase } from 'plaid'

function CreditCardDisplay({ account }: { account: AccountBase }) {
  const balance = account.balances.current ?? 0
  const limit = account.balances.limit ?? 0
  const available = account.balances.available ?? limit - balance
  const utilization = limit > 0 ? Math.round((balance / limit) * 100) : 0
  const utilizationColor =
    utilization > 75 ? 'text-red-600' : utilization > 50 ? 'text-yellow-600' : 'text-green-600'

  return (
    <Card className="overflow-hidden">
      {/* Card visual */}
      <div className="h-36 bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white">
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium opacity-80">{account.name}</span>
          <CreditCard className="h-6 w-6 opacity-60" />
        </div>
        <div className="mt-6 font-mono text-lg tracking-widest">
          •••• •••• •••• {account.mask}
        </div>
      </div>

      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Current Balance</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(balance)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Credit Limit</p>
            <p className="text-lg font-bold">{formatCurrency(limit)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Available Credit</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(available)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Utilization</p>
            <p className={`text-lg font-bold ${utilizationColor}`}>{utilization}%</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Credit used</span>
            <span>{utilization}%</span>
          </div>
          <Progress value={utilization} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}

function DebitCardDisplay({ account }: { account: AccountBase }) {
  const balance = account.balances.current ?? 0
  const available = account.balances.available

  return (
    <Card className="overflow-hidden">
      <div className="h-36 bg-gradient-to-br from-gray-700 to-gray-900 p-5 text-white">
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium opacity-80">{account.name}</span>
          <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
            {account.subtype}
          </Badge>
        </div>
        <div className="mt-6 font-mono text-lg tracking-widest">
          •••• •••• •••• {account.mask}
        </div>
      </div>

      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Current Balance</p>
            <p className="text-lg font-bold">{formatCurrency(balance)}</p>
          </div>
          {available != null && (
            <div>
              <p className="text-xs text-gray-500">Available</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(available)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function CardsPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  if (!item) redirect('/dashboard/connect')

  const accounts = await getAccounts(item.accessToken)
  const creditCards = accounts.filter((a) => a.type === 'credit')
  const debitAccounts = accounts.filter((a) => a.type === 'depository')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Cards</h1>

      {creditCards.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Credit Cards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {creditCards.map((a) => (
              <CreditCardDisplay key={a.account_id} account={a} />
            ))}
          </div>
        </div>
      )}

      {debitAccounts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Debit Accounts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {debitAccounts.map((a) => (
              <DebitCardDisplay key={a.account_id} account={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/dashboard/cards/
git commit -m "feat: add cards page with credit utilization display"
```

---

## Task 16: Run All Tests + Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: All tests pass

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Full flow walkthrough**

```bash
npm run dev
```

Walk through each step:
1. Visit `http://localhost:3000` — landing page loads
2. Click "Get Started" → sign up
3. Redirected to `/dashboard/connect`
4. Click "Connect Bank Account" → Plaid Link opens
5. Select any institution → use `user_good` / `pass_good`
6. Redirected to `/dashboard` — overview loads with data
7. Navigate to Accounts → all accounts shown
8. Navigate to Transactions → table with search/filter works
9. Navigate to Analytics → charts render
10. Navigate to Cards → credit/debit cards shown
11. Resize to mobile → bottom nav appears, sidebar hides

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "test: verify all tests pass and full flow works"
```

---

## Task 17: Deploy to Vercel

- [ ] **Step 1: Create Vercel project**

```bash
npx vercel
```

Follow prompts: link to existing project or create new. Choose framework: Next.js.

- [ ] **Step 2: Set environment variables in Vercel**

Go to Vercel dashboard → Project → Settings → Environment Variables. Add each variable from `.env.local`:

```
PLAID_CLIENT_ID
PLAID_SECRET
PLAID_ENV=sandbox
NEXT_PUBLIC_PLAID_ENV=sandbox
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/connect
DATABASE_URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

- [ ] **Step 3: Update Clerk allowed origins**

In Clerk dashboard → Domains, add your Vercel deployment URL.

- [ ] **Step 4: Deploy**

```bash
npx vercel --prod
```

Expected: Deployment URL printed, app live.

- [ ] **Step 5: Smoke test production**

Visit the deployment URL and complete the full flow with Plaid Sandbox credentials.

---

## Account Setup Prerequisites

Before starting Task 1, set up these accounts and collect credentials:

| Service | URL | What to get |
|---|---|---|
| Plaid | dashboard.plaid.com | `client_id` + sandbox `secret` |
| Clerk | dashboard.clerk.com | `publishable_key` + `secret_key` |
| Neon | console.neon.tech | Postgres connection string |
| Vercel | vercel.com | (CLI handles auth) |
