'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/push'

// Registers the push-only service worker once on the client. Required for Web
// Push (and PWA install). Safe: the SW has no fetch handler, so it can't affect
// navigation or auth.
export function ServiceWorkerRegister() {
  useEffect(() => { registerServiceWorker() }, [])
  return null
}
