import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

let _db: Db | undefined

export const db = new Proxy({} as Db, {
  get(_, prop: string | symbol) {
    if (!_db) {
      const sql = neon(process.env.DATABASE_URL!)
      _db = drizzle(sql, { schema })
    }
    return (_db as Db)[prop as keyof Db]
  },
})
