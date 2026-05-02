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
