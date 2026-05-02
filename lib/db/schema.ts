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
