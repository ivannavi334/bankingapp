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
            Securely link your bank account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="mb-2 font-semibold">Demo mode instructions:</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Enter any phone number</li>
              <li>
                Verification code:{' '}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold">123456</code>
              </li>
              <li>Select any bank</li>
              <li>Select any cards</li>
              <li>Enter any phone number again</li>
            </ol>
          </div>
          <div className="flex justify-center">
            <PlaidLinkButton linkToken={linkToken} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
