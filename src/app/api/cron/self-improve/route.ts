// @ts-nocheck
// Weekly self-improvement — the company reviews its own agent-run errors and
// proposes prompt improvements into the manager review queue (nothing is applied
// without human approval). Guarded by CRON_SECRET; service-role client iterates
// teams. 501 until configured.
//
// Schedule (vercel.json): { "path": "/api/cron/self-improve", "schedule": "0 5 * * 1" } (Mondays)

import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { synthesizeSelfImprovement } from '@/lib/growth/selfImprove'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || !url || !serviceKey) {
    return NextResponse.json({ error: 'Not configured — set CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY' }, { status: 501 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdmin(url, serviceKey, { auth: { persistSession: false } })
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: recent } = await supabase.from('agent_runs').select('team_id').eq('status', 'error').gte('started_at', since).not('team_id', 'is', null)
  const teamIds = [...new Set((recent ?? []).map((r: any) => r.team_id).filter(Boolean))]

  let created = 0
  const perTeam: any[] = []
  for (const teamId of teamIds) {
    // Skip agents that already have a pending self-review proposal (avoid dupes).
    const { data: pending } = await supabase.from('growth_instruction_proposals')
      .select('agent_id').eq('team_id', teamId).eq('status', 'pending')
    const pendingAgents = new Set((pending ?? []).map((p: any) => p.agent_id))
    const { rows } = await synthesizeSelfImprovement({ supabase, teamId })
    const fresh = rows.filter((r: any) => !pendingAgents.has(r.agent_id))
    if (fresh.length) {
      const { error } = await supabase.from('growth_instruction_proposals').insert(fresh)
      if (!error) { created += fresh.length; perTeam.push({ teamId, created: fresh.length }) }
    }
  }
  return NextResponse.json({ teams: teamIds.length, created, perTeam })
}
