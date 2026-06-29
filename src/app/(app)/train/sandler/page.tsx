// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SandlerRules from '@/components/sandler-rules'

// Standalone "book training" module. The Sandler course is a self-contained
// client component; we mount it embedded so it inherits the BDR OS shell/fonts
// and persist its progress to Supabase (module_progress / module_certifications)
// via the storageAdapter contract it expects.
export default function SandlerTrainingPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user
      if (!u) { router.push('/login'); return }
      setUser({ id: u.id, name: u.user_metadata?.full_name || u.email, email: u.email })
      setReady(true)
    })
  }, [supabase, router])

  if (!ready || !user) return null
  const uid = user.id

  // get/set/list/del — get & list accept a `shared` flag for the manager roster rows.
  const storageAdapter = {
    async get(key: string, shared = false) {
      let q = supabase.from('module_progress').select('value').eq('key', key)
      q = shared ? q.eq('shared', true) : q.eq('user_id', uid)
      const { data } = await q.maybeSingle()
      return data ? data.value : null
    },
    async set(key: string, value: any, shared = false) {
      await supabase.from('module_progress')
        .upsert({ user_id: uid, key, value, shared }, { onConflict: 'user_id,key' })
    },
    async list(prefix: string, shared = false) {
      let q = supabase.from('module_progress').select('key').like('key', prefix + '%')
      q = shared ? q.eq('shared', true) : q.eq('user_id', uid)
      const { data } = await q
      return (data || []).map((r: any) => r.key)
    },
    async del(key: string) {
      await supabase.from('module_progress').delete().eq('user_id', uid).eq('key', key)
    },
  }

  return (
    <SandlerRules
      embedded
      injectedUser={user}
      storageAdapter={storageAdapter}
      onCertified={async (c: any) => {
        await supabase.from('module_certifications').insert({
          user_id: uid,
          module: c.module,
          score: c.score,
          total: c.total,
          perfect: c.perfect,
        })
      }}
      onExit={() => router.push('/train')}
    />
  )
}
