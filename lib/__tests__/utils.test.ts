/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate, groupByCategory, getMonthlyTotals, getTopMerchants } from '../utils'

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

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'ignored', 'added')).toBe('base added')
  })
})

describe('getTopMerchants', () => {
  it('returns top N merchants sorted by amount', () => {
    const transactions = [
      { merchant_name: 'Amazon', name: 'Amazon', amount: 100 },
      { merchant_name: 'Starbucks', name: 'Starbucks', amount: 50 },
      { merchant_name: 'Amazon', name: 'Amazon', amount: 200 },
    ] as any[]

    const result = getTopMerchants(transactions, 2)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Amazon')
    expect(result[0].amount).toBe(300)
    expect(result[0].count).toBe(2)
  })

  it('skips negative amounts', () => {
    const transactions = [
      { merchant_name: 'Refund', name: 'Refund', amount: -100 },
      { merchant_name: 'Shop', name: 'Shop', amount: 50 },
    ] as any[]

    const result = getTopMerchants(transactions)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Shop')
  })
})
