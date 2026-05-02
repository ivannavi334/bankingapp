import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem, getTransactions } from '@/lib/actions'
import { formatCurrency, groupByCategory, getMonthlyTotals, getTopMerchants } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SpendingChart } from '@/components/dashboard/spending-chart'
import { CategoryChart } from '@/components/dashboard/category-chart'

function formatCategory(key: string): string {
  return key
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function AnalyticsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  if (!item) redirect('/dashboard/connect')

  const transactions = await getTransactions(item.accessToken, 90)

  const categoryTotals = groupByCategory(transactions)
  const categoryData = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name: formatCategory(name), value: Math.round(value * 100) / 100 }))

  const monthlyData = getMonthlyTotals(transactions)
  const topMerchants = getTopMerchants(transactions, 10)

  const totalSpend = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      <p className="text-sm text-gray-400">Last 90 days · {transactions.length} transactions</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly spend bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingChart data={monthlyData} />
          </CardContent>
        </Card>

        {/* Category pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={categoryData} />
          </CardContent>
        </Card>
      </div>

      {/* Top merchants table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Merchants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topMerchants.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">No data</p>
          ) : (
            <div className="divide-y">
              {topMerchants.map((m, i) => (
                <div key={m.name} className="flex items-center gap-4 px-6 py-3">
                  <span className="w-6 shrink-0 text-sm font-medium text-gray-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.count} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(m.amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {totalSpend > 0
                        ? `${((m.amount / totalSpend) * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
