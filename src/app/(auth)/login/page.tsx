'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'
import { MailIcon } from '@/components/icons'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-teal rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
          <span className="text-2xl font-bold text-white">B</span>
        </div>
        <h1 className="text-2xl font-bold text-white">BDR OS</h1>
        <p className="text-white/70 text-sm mt-1">ConsumerDirect Performance System</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-card-hover p-6">
        {!sent ? (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
            <p className="text-sm text-gray-500 mb-5">
              Enter your work email to receive a sign-in link.
            </p>

            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-label text-gray-700 mb-1 block">
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@consumerdirect.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Send Sign-In Link
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-2">
            <div className="w-12 h-12 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MailIcon className="text-teal" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your inbox</h2>
            <p className="text-sm text-gray-500 mb-4">
              We sent a sign-in link to{' '}
              <span className="font-medium text-gray-700">{email}</span>
            </p>
            <p className="text-xs text-gray-400">
              Didn&apos;t receive it?{' '}
              <button
                onClick={() => setSent(false)}
                className="text-navy underline hover:no-underline"
              >
                Try again
              </button>
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-white/50 text-xs mt-6">
        &copy; {new Date().getFullYear()} ConsumerDirect. All rights reserved.
      </p>
    </div>
  )
}
