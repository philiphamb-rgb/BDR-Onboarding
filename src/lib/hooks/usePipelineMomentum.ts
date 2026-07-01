// @ts-nocheck
'use client'

// Live pipeline momentum. Reads the BDR's own open partner deals from
// partner_onboarding and rolls them up into a single weighted number:
//   weighted/mo = Σ (deal_amount × deal_probability%)  over OPEN deals
// This bridges the money math (Commissions plan) to the real CRM pipeline —
// "here's what you've actually got working toward that goal." RLS-safe: the
// query is naturally scoped to the signed-in user's rows.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Stages that no longer count as open, forward-looking pipeline.
const CLOSED = new Set(['won', 'closed_won', 'lost', 'closed_lost', 'churned', 'dead'])

export function usePipelineMomentum() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ weighted: 0, gross: 0, openCount: 0, priced: 0, topStage: null as string | null })

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (alive) setLoading(false); return }
      const { data: rows } = await supabase
        .from('partner_onboarding')
        .select('stage, deal_amount, deal_probability')
        .eq('user_id', user.id)
      if (!alive) return
      let weighted = 0, gross = 0, openCount = 0, priced = 0
      const stageWeight: Record<string, number> = {}
      for (const r of rows || []) {
        if (CLOSED.has((r.stage || '').toLowerCase())) continue
        openCount++
        const amt = r.deal_amount != null ? Number(r.deal_amount) : 0
        if (!amt) continue
        const prob = r.deal_probability != null ? Math.min(100, Math.max(0, Number(r.deal_probability))) : 0
        const w = (amt * prob) / 100
        weighted += w; gross += amt; priced++
        const s = r.stage || 'lead'
        stageWeight[s] = (stageWeight[s] || 0) + w
      }
      const topStage = Object.keys(stageWeight).sort((a, b) => stageWeight[b] - stageWeight[a])[0] || null
      setData({ weighted, gross, openCount, priced, topStage })
      setLoading(false)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { loading, ...data }
}
