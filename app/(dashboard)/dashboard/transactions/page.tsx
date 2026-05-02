import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem, getTransactions, getAccounts } from '@/lib/actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function categoryLabel(primary?: string | null): string {
  if (!primary) return 'Other'
  return primary
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const CATEGORY_COLORS: Record<string, string> = {
  'Food And Drink': 'bg-orange-100 text-orange-700',
  Transportation: 'bg-blue-100 text-blue-700',
  Shopping: 'bg-pink-100 text-pink-700',
  Entertainment: 'bg-purple-100 text-purple-700',
  'Health And Wellness': 'bg-green-100 text-green-700',
  Travel: 'bg-cyan-100 text-cyan-700',
  Other: 'bg-gray-100 text-gray-600',
}

function badgeClass(label: string): string {
  return CATEGORY_COLORS[label] ?? CATEGORY_COLORS.Other
}

export default async function TransactionsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  if (!item) redirect('/dashboard/connect')

  const [transactions, accounts] = await Promise.all([
    getTransactions(item.accessToken, 90),
    getAccounts(item.accessToken),
  ])

  const accountMap = Object.fromEntries(accounts.map((a) => [a.account_id, a.name]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <span className="text-sm text-gray-400">{transactions.length} in last 90 days</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">No transactions found</p>
          ) : (
            <div className="divide-y">
              {transactions.map((t) => {
                const label = categoryLabel(t.personal_finance_category?.primary)
                return (
                  <div
                    key={t.transaction_id}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {t.merchant_name ?? t.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-gray-400">{formatDate(t.date)}</span>
                        {accountMap[t.account_id] && (
                          <>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{accountMap[t.account_id]}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`shrink-0 text-xs ${badgeClass(label)}`}
                    >
                      {label}
                    </Badge>
                    <span
                      className={`w-20 shrink-0 text-right text-sm font-semibold ${
                        t.amount < 0 ? 'text-green-600' : 'text-gray-900'
                      }`}
                    >
                      {t.amount < 0 ? '+' : ''}
                      {formatCurrency(Math.abs(t.amount))}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
