// @ts-nocheck
'use client'

// Generic per-user key/value progress hook over the shared `module_progress`
// table — the same pattern useBattleCards uses, factored out so any lightweight
// module surface (Apex Content board, Build phases, …) can persist a small
// JSON blob without a bespoke table. One row per (user, key).

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useModuleKV<T extends object>(key: string, empty: T) {
  const supabase = createClient()
  const [value, setValue] = useState<T>(empty)
  const [loading, setLoading] = useState(true)
  const uidRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) { setLoading(false); return }
      uidRef.current = user.id
      const { data } = await supabase.from('module_progress').select('value').eq('user_id', user.id).eq('key', key).maybeSingle()
      if (active && data?.value) setValue({ ...empty, ...data.value })
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist a value, resolving the user id inline if it hasn't loaded yet — so an
  // early save (a task toggled in the first ~100ms) is never silently dropped.
  const persist = async (next: T) => {
    let id = uidRef.current
    if (!id) { const { data: { user } } = await supabase.auth.getUser(); id = user?.id ?? null; uidRef.current = id }
    if (id) supabase.from('module_progress').upsert({ user_id: id, key, value: next, shared: false }, { onConflict: 'user_id,key' }).then(() => {})
  }

  // Merge a patch (object or updater) and persist optimistically. Derived off the
  // latest committed state inside setValue so rapid same-frame saves don't read a
  // stale ref and drop each other's changes.
  const save = (patch: Partial<T> | ((p: T) => Partial<T>)) => {
    setValue(prev => {
      const p = typeof patch === 'function' ? (patch as any)(prev) : patch
      const next = { ...prev, ...p }
      persist(next)
      return next
    })
  }

  return { loading, value, save }
}
