'use client'

import { TabErrorFallback } from '@/components/TabErrorFallback'

// Scoped to the "settings" route segment — the (app) sidebar/header keep
// rendering; only this tab's content area falls back on a crash.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <TabErrorFallback error={error} reset={reset} label="Settings" />
}
