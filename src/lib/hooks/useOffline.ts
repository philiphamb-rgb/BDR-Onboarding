// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Online/Offline Detection ─────────────────────────────────────────────────

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// ─── Offline Action Queue ──────────────────────────────────────────────────────

type QueuedAction =
  | { type: 'habit_log';  userId: string; habitId: string; date: string }
  | { type: 'win_log';    userId: string; winType: string; description: string }
  | { type: 'xp_action';  userId: string; action: string; metadata: Record<string, unknown> }

const QUEUE_KEY = 'bdr_os_action_queue'

function loadQueue(): QueuedAction[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedAction[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function useOfflineQueue() {
  const isOnline = useOnlineStatus()
  const queueRef = useRef<QueuedAction[]>(loadQueue())
  const [pendingCount, setPendingCount] = useState(queueRef.current.length)
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  const enqueue = useCallback((action: QueuedAction) => {
    queueRef.current = [...queueRef.current, action]
    saveQueue(queueRef.current)
    setPendingCount(queueRef.current.length)
  }, [])

  const syncQueue = useCallback(async () => {
    if (queueRef.current.length === 0 || !isOnline) return
    setSyncing(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSyncing(false); return }

    const remaining: QueuedAction[] = []

    for (const action of queueRef.current) {
      try {
        if (action.type === 'habit_log') {
          const { error } = await supabase.from('habit_logs').insert({
            user_id: action.userId,
            habit_id: action.habitId,
            date: action.date,
          })
          if (error && error.code !== '23505') remaining.push(action)  // 23505 = already exists
        } else if (action.type === 'win_log') {
          const { error } = await supabase.from('wins').insert({
            user_id: action.userId,
            type: action.winType,
            description: action.description,
          })
          if (error) remaining.push(action)
        } else if (action.type === 'xp_action') {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ action: action.action, user_id: action.userId, ...action.metadata }),
            }
          )
          if (!res.ok) remaining.push(action)
        }
      } catch {
        remaining.push(action)
      }
    }

    queueRef.current = remaining
    saveQueue(remaining)
    setPendingCount(remaining.length)
    setSyncing(false)
  }, [isOnline, supabase])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queueRef.current.length > 0) {
      syncQueue()
    }
  }, [isOnline, syncQueue])

  return { enqueue, syncQueue, pendingCount, syncing, isOnline }
}
