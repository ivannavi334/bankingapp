import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createLinkToken } from '@/lib/actions'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const linkToken = await createLinkToken(userId)
    return NextResponse.json({ link_token: linkToken })
  } catch (error) {
    console.error('[link-token]', error)
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 })
  }
}
