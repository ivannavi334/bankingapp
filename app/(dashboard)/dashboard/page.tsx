import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem, getAccounts, getTransactions } from '@/lib/actions'
import { formatCurrency, formatDate, getMonthlyTotals } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SpendingChart } from '@/components/dashboard/spending-chart'
import { Wallet, ArrowLeftRight, TrendingDown, Building2 } from 'lucide-react'
import type { AccountBase, Transaction } from 'plaid'

function totalBalance(accounts: AccountBase[]): number {
  return accounts.reduce((sum, a) => sum + (a.balances.current ?? 0), 0)
}

function monthlySpend(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
}

export default async function OverviewPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  if (!item) redirect('/dashboard/connect')

  const [accounts, transactions] = await Promise.all([
    getAccounts(item.accessToken),
    getTransactions(item.accessToken, 30),
  ])

  const balance = totalBalance(accounts)
  const spend = monthlySpend(transactions)
  const monthlyData = getMonthlyTotals(transactions)
  const recent = transactions.slice(0, 8)

  const stats = [
    {
      label: 'Total Balance',
      value: formatCurrency(balance),
      icon: Wallet,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: '30-Day Spend',
      value: formatCurrency(spend),
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Transactions',
      value: transactions.length.toString(),
      icon: ArrowLeftRight,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Accounts',
      value: accounts.length.toString(),
      icon: Building2,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly spending chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingChart data={monthlyData} />
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-gray-400">No transactions found</p>
            ) : (
              <ul className="space-y-3">
                {recent.map((t) => (
                  <li key={t.transaction_id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {t.merchant_name ?? t.name}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        t.amount < 0 ? 'text-green-600' : 'text-gray-900'
                      }`}
                    >
                      {t.amount < 0 ? '+' : ''}
                      {formatCurrency(Math.abs(t.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
