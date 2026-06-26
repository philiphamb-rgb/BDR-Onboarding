'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'
import { MailIcon } from '@/components/icons'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // The link still works as a fallback (desktop / same-browser); the
        // 6-digit code is the primary path because it survives corporate
        // email link-scanners (e.g. Microsoft 365 Safe Links).
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/home`,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = code.trim()
    if (token.length < 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }

    setVerifying(true)
    setError('')

    // Verify server-side so the session cookie is set on the response before
    // we navigate — a browser-side verify races the redirect and bounces back
    // to this screen.
    let data: { ok?: boolean; next?: string } = {}
    try {
      const res = await fetch('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), token }),
      })
      data = await res.json()
    } catch {
      data = {}
    }

    if (!data.ok) {
      setVerifying(false)
      setError('That code is incorrect or expired. Request a new one.')
    } else {
      // Full navigation so middleware reads the freshly-set session cookie.
      window.location.href = data.next || '/home'
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
              Enter your work email and we&apos;ll send you a 6-digit code.
            </p>

            <form onSubmit={handleSendCode} className="space-y-4">
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
                Send Code
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MailIcon className="text-teal" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Check your inbox</h2>
              <p className="text-sm text-gray-500">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-gray-700">{email}</span>.
                Enter it below.
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="code" className="text-label text-gray-700 mb-1 block">
                  6-digit code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-center text-2xl tracking-[0.5em] font-semibold focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button type="submit" loading={verifying} className="w-full" size="lg">
                Verify &amp; Sign In
              </Button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-4">
              Didn&apos;t get it?{' '}
              <button
                onClick={() => {
                  setSent(false)
                  setCode('')
                  setError('')
                }}
                className="text-navy underline hover:no-underline"
              >
                Use a different email
              </button>
            </p>
          </>
        )}
      </div>

      <p className="text-center text-white/50 text-xs mt-6">
        &copy; {new Date().getFullYear()} ConsumerDirect. All rights reserved.
      </p>
    </div>
  )
}
