import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem, getAccounts } from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, CreditCard, PiggyBank, Wallet } from 'lucide-react'
import type { AccountBase } from 'plaid'

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  depository: Wallet,
  credit: CreditCard,
  investment: PiggyBank,
  loan: Building2,
  other: Building2,
}

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  depository: 'bg-blue-50 text-blue-600',
  credit: 'bg-purple-50 text-purple-600',
  investment: 'bg-green-50 text-green-600',
  loan: 'bg-orange-50 text-orange-600',
  other: 'bg-gray-50 text-gray-600',
}

function AccountCard({ account }: { account: AccountBase }) {
  const type = account.type.toLowerCase()
  const Icon = ACCOUNT_TYPE_ICONS[type] ?? Building2
  const colorClass = ACCOUNT_TYPE_COLORS[type] ?? ACCOUNT_TYPE_COLORS.other

  const balance = account.balances.current ?? account.balances.available ?? 0
  const available = account.balances.available
  const limit = account.balances.limit

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{account.name}</p>
              <p className="text-xs text-gray-400 capitalize">
                {account.subtype ?? account.type} · ····{account.mask ?? '????'}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="capitalize shrink-0">
            {account.type}
          </Badge>
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Current Balance</span>
            <span className="font-semibold text-gray-900">{formatCurrency(balance)}</span>
          </div>
          {available != null && available !== balance && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Available</span>
              <span className="text-gray-700">{formatCurrency(available)}</span>
            </div>
          )}
          {limit != null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Credit Limit</span>
              <span className="text-gray-700">{formatCurrency(limit)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AccountsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  if (!item) redirect('/dashboard/connect')

  const accounts = await getAccounts(item.accessToken)

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balances.current ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total Balance</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBalance)}</p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            No accounts found
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.account_id} account={account} />
          ))}
        </div>
      )}
    </div>
  )
}
