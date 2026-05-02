import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlaidItem, getAccounts } from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { CreditCard } from 'lucide-react'
import type { AccountBase } from 'plaid'

const CARD_GRADIENTS = [
  'from-blue-600 to-blue-800',
  'from-purple-600 to-purple-800',
  'from-slate-700 to-slate-900',
  'from-green-600 to-green-800',
]

function CreditCardDisplay({ account, index }: { account: AccountBase; index: number }) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
  const balance = account.balances.current ?? 0
  const limit = account.balances.limit
  const available = account.balances.available

  const utilization =
    limit != null && limit > 0 ? Math.round((balance / limit) * 100) : null

  return (
    <div className="space-y-4">
      {/* Card visual */}
      <div
        className={`relative h-44 w-full max-w-sm rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg`}
      >
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium opacity-80">{account.name}</p>
          <CreditCard className="h-6 w-6 opacity-70" />
        </div>
        <div className="mt-6">
          <p className="font-mono text-lg tracking-widest">
            ···· ···· ···· {account.mask ?? '????'}
          </p>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xs opacity-70">Balance</p>
            <p className="text-xl font-bold">{formatCurrency(balance)}</p>
          </div>
          {limit != null && (
            <div className="text-right">
              <p className="text-xs opacity-70">Limit</p>
              <p className="text-lg font-semibold">{formatCurrency(limit)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats below card */}
      <div className="grid grid-cols-2 gap-3">
        {available != null && (
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-gray-500">Available</p>
              <p className="text-base font-semibold text-gray-900">{formatCurrency(available)}</p>
            </CardContent>
          </Card>
        )}
        {utilization != null && (
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-gray-500">Utilization</p>
              <p
                className={`text-base font-semibold ${
                  utilization > 30 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {utilization}%
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default async function CardsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const item = await getPlaidItem(userId)
  if (!item) redirect('/dashboard/connect')

  const accounts = await getAccounts(item.accessToken)
  const cards = accounts.filter(
    (a) => a.type === 'credit' || a.subtype === 'credit card',
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Cards</h1>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-400">No credit cards found in connected accounts</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, i) => (
            <CreditCardDisplay key={card.account_id} account={card} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
