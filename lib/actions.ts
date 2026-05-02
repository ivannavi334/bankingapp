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
