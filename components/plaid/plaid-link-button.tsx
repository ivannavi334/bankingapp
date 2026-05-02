'use client'

import { useCallback, useState } from 'react'
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface PlaidLinkButtonProps {
  linkToken: string
}

export function PlaidLinkButton({ linkToken }: PlaidLinkButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setLoading(true)
      try {
        const res = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata.institution,
          }),
        })
        if (!res.ok) throw new Error('Token exchange failed')
        router.push('/dashboard')
        router.refresh()
      } catch (err) {
        console.error('[plaid-link]', err)
        setLoading(false)
      }
    },
    [router],
  )

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess })

  return (
    <Button
      size="lg"
      onClick={() => open()}
      disabled={!ready || loading}
      className="gap-2"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? 'Connecting...' : 'Connect Bank Account'}
    </Button>
  )
}
