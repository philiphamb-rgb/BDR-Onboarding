'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError('')

    let data: { ok?: boolean; next?: string } = {}
    try {
      const res = await fetch('/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      data = await res.json()
    } catch {
      data = {}
    }

    if (!data.ok) {
      setLoading(false)
      setError('Incorrect email or password.')
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
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
        <p className="text-sm text-gray-500 mb-5">Enter your email and password.</p>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-label text-gray-700 mb-1 block">
              Email
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

          <div>
            <label htmlFor="password" className="text-label text-gray-700 mb-1 block">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign In
          </Button>
        </form>
      </div>

      <p className="text-center text-white/50 text-xs mt-6">
        &copy; {new Date().getFullYear()} ConsumerDirect. All rights reserved.
      </p>
    </div>
  )
}
