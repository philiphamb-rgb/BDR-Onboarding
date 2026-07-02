'use client'

import { useEffect } from 'react'
import { AlertIcon, RefreshIcon } from '@/components/icons'

// Shared body for every route-level error.tsx under (app). Placed inside each
// route's own folder (not shared via layout) so Next.js scopes the boundary to
// that segment only — the sidebar/header in (app)/layout.tsx keep rendering
// normally, and every other tab keeps working. Logs to console now; wire a
// real monitoring hook (Sentry, etc.) at the marked spot when one exists.
export function TabErrorFallback({ error, reset, label }: { error: Error & { digest?: string }; reset: () => void; label?: string }) {
  useEffect(() => {
    console.error(`[${label ?? 'tab'}] error boundary caught:`, error)
    // TODO: forward to a real error monitor once one is wired up, e.g.:
    // Sentry.captureException(error, { tags: { tab: label } })
  }, [error, label])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
        <AlertIcon size={26} />
      </div>
      <h2 className="text-h3 text-dark-text">{label ? `${label} hit a snag` : 'This screen hit a snag'}</h2>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-gray">
        Something went wrong loading this page. The rest of BDR Hub is unaffected — try again, or come back in a moment.
      </p>
      <button onClick={reset} className="mt-5 flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[13px] font-[800] text-white hover:bg-navy-dark">
        <RefreshIcon size={15} /> Try again
      </button>
      {error?.digest && <p className="mt-4 text-[11px] text-gray">Reference: {error.digest}</p>}
    </div>
  )
}
