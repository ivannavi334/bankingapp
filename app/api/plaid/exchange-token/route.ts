import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { db } from '@/lib/db'
import { plaidItems } from '@/lib/db/schema'
import { ensureUser } from '@/lib/actions'

interface ExchangeBody {
  public_token: string
  institution: { name: string; institution_id: string }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { public_token, institution }: ExchangeBody = await req.json()

  try {
    const user = await currentUser()
    await ensureUser(userId, user?.emailAddresses[0]?.emailAddress ?? '')

    const res = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = res.data

    await db.insert(plaidItems).values({
      userId,
      accessToken: access_token,
      itemId: item_id,
      institutionId: institution.institution_id,
      institutionName: institution.name,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[exchange-token]', error)
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 })
  }
}
