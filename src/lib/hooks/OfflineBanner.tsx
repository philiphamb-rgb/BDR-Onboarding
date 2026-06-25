'use client'

import { useState, useEffect } from 'react'
import { useOnlineStatus } from './useOffline'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const [wasOffline, setWasOffline] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true)
      setWasOffline(true)
    } else if (wasOffline) {
      setShowBanner(false)
      setShowReconnected(true)
      const t = setTimeout(() => { setShowReconnected(false); setWasOffline(false) }, 3000)
      return () => clearTimeout(t)
    }
  }, [isOnline, wasOffline])

  if (!showBanner && !showReconnected) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-[550] flex items-center justify-center gap-2 py-2 text-xs font-medium transition-all duration-300 ${showReconnected ? 'bg-teal text-white' : 'bg-gray-900 text-white'}`}>
      {showReconnected ? (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Back online — syncing your activity
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728m12.728 0L12 12m0 0l-6.364-6.364" />
          </svg>
          Offline — actions will sync when reconnected
        </>
      )}
    </div>
  )
}
