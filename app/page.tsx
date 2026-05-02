import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BarChart3, Shield, Zap } from 'lucide-react'

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Spending Analytics',
    description: 'Visualize where your money goes with interactive charts and category breakdowns.',
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Your credentials are never stored. We use Plaid for secure read-only bank access.',
  },
  {
    icon: Zap,
    title: 'Real-Time Balances',
    description: 'See all your accounts, balances, and recent transactions in one place.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-4">
          <span className="font-bold text-xl text-blue-600">FinanceFlow</span>
          <div className="flex gap-3">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Your finances,{' '}
          <span className="text-blue-600">crystal clear</span>
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
          Connect your US bank accounts and get a complete picture of your spending,
          balances, and financial health — all in one dashboard.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/sign-up">Get Started Free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 mb-4">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} FinanceFlow. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
