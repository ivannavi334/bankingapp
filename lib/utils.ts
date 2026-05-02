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
