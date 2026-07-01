// @ts-nocheck
'use client'

// Generic per-user key/value progress hook over the shared `module_progress`
// table — the same pattern useBattleCards uses, factored out so any lightweight
// module surface (Cortex Content board, Build phases, …) can persist a small
// JSON blob without a bespoke table. One row per (user, key).

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useModuleKV<T extends object>(key: string, empty: T) {
  const supabase = createClient()
  const [uid, setUid] = useState<string | null>(null)
  const [value, setValue] = useState<T>(empty)
  const [loading, setLoading] = useState(true)
  const ref = useRef<T>(empty)
  ref.current = value

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) { setLoading(false); return }
      setUid(user.id)
      const { data } = await supabase.from('module_progress').select('value').eq('user_id', user.id).eq('key', key).maybeSingle()
      if (active && data?.value) setValue({ ...empty, ...data.value })
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Merge a patch (object or updater) and persist optimistically. Derived off the
  // latest committed state inside setValue so rapid same-frame saves don't read a
  // stale ref and drop each other's changes.
  const save = (patch: Partial<T> | ((p: T) => Partial<T>)) => {
    setValue(prev => {
      const p = typeof patch === 'function' ? (patch as any)(prev) : patch
      const next = { ...prev, ...p }
      if (uid) supabase.from('module_progress').upsert({ user_id: uid, key, value: next, shared: false }, { onConflict: 'user_id,key' }).then(() => {})
      return next
    })
  }

  return { loading, value, save }
}
