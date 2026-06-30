// @ts-nocheck
'use client'

// Battle Cards progress — persisted to the SAME module_progress KV table the
// Sandler course uses (one row per user, key 'battlecards', value = JSON blob).
// No new table: this is the established learning-progress pattern.

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const KEY = 'battlecards'

export interface BCProgress {
  step: number                       // current training step index
  done: boolean                      // training finished → reference tool
  quiz: Record<string, boolean>      // training step index → answered correctly
  checks: Record<string, number[]>   // competitor key → mastered card indexes
  celebrated: string[]               // competitor keys (+ 'all') already celebrated
}

const EMPTY: BCProgress = { step: 0, done: false, quiz: {}, checks: {}, celebrated: [] }

export function useBattleCards() {
  const supabase = createClient()
  const [uid, setUid] = useState<string | null>(null)
  const [progress, setProgress] = useState<BCProgress>(EMPTY)
  const [loading, setLoading] = useState(true)
  const ref = useRef<BCProgress>(EMPTY)
  ref.current = progress

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) { setLoading(false); return }
      setUid(user.id)
      const { data } = await supabase.from('module_progress').select('value').eq('user_id', user.id).eq('key', KEY).maybeSingle()
      if (active && data?.value) setProgress({ ...EMPTY, ...data.value })
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Merge a patch into progress and persist (optimistic).
  const save = (patch: Partial<BCProgress> | ((p: BCProgress) => Partial<BCProgress>)) => {
    const p = typeof patch === 'function' ? patch(ref.current) : patch
    const next = { ...ref.current, ...p }
    setProgress(next)
    if (uid) supabase.from('module_progress').upsert({ user_id: uid, key: KEY, value: next, shared: false }, { onConflict: 'user_id,key' }).then(() => {})
  }

  const certify = (score: number, total: number) => {
    if (!uid) return
    supabase.from('module_certifications').insert({ user_id: uid, module: KEY, score, total, perfect: score === total }).then(() => {}, () => {})
  }

  return { loading, progress, save, certify }
}
