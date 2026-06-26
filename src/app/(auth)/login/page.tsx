'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const params = useSearchParams()
  const hasError = params.get('error')

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/consumerdirect-mark.svg" alt="ConsumerDirect" className="w-full h-full" />
        </div>
        <h1 className="text-2xl font-bold text-white">BDR Onboarding Tool</h1>
        <p className="text-white/70 text-sm mt-1">ConsumerDirect</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-modal p-6">
        <h2 className="text-lg font-semibold text-dark-text mb-1">Sign in</h2>
        <p className="text-sm text-gray mb-5">Enter your email and password.</p>

        {/* Native form POST → server sets the session cookie on a redirect.
            This avoids the fetch/service-worker cookie hand-off. */}
        <form action="/auth/password-login" method="post" className="space-y-4">
          <div>
            <label htmlFor="email" className="text-label text-mid-text mb-1 block">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@consumerdirect.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="text-label text-mid-text mb-1 block">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition"
              autoComplete="current-password"
            />
          </div>

          {hasError && (
            <p className="text-sm text-error bg-error/5 rounded-lg px-3 py-2">
              Incorrect email or password.
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-teal hover:bg-teal-dark text-white font-semibold rounded-xl py-3 text-base transition shadow-lg"
          >
            Sign In
          </button>
        </form>
      </div>

      <p className="text-center text-white/50 text-xs mt-6">
        &copy; {new Date().getFullYear()} ConsumerDirect. All rights reserved.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
