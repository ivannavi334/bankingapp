import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createLinkToken, getPlaidItem } from '@/lib/actions'
import { PlaidLinkButton } from '@/components/plaid/plaid-link-button'
import { Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ConnectPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const existing = await getPlaidItem(userId)
  if (existing) redirect('/dashboard')

  const linkToken = await createLinkToken(userId)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Building2 className="h-7 w-7 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Connect Your Bank</CardTitle>
          <CardDescription>
            Securely link your bank account to get started. Use{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">user_good</code> /{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">pass_good</code> for the demo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <PlaidLinkButton linkToken={linkToken} />
        </CardContent>
      </Card>
    </div>
  )
}
