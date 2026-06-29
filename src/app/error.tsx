'use client'

import { useEffect } from 'react'

// Route-level error boundary: catches runtime errors in any page below the root
// layout and shows a recoverable, branded screen instead of a white crash.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface to the console / monitoring. In production, wire this to your
    // error tracker (e.g. Sentry) here.
    console.error('App error boundary:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h1 className="text-h2 text-dark-text mb-2">Something went wrong</h1>
      <p className="mb-6 max-w-sm text-sm text-gray">
        An unexpected error occurred. You can try again, or head back to your home screen.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary">Try again</button>
        <a href="/home" className="btn-ghost">Go home</a>
      </div>
      {error?.digest && <p className="mt-6 text-[11px] text-gray">Reference: {error.digest}</p>}
    </div>
  )
}
