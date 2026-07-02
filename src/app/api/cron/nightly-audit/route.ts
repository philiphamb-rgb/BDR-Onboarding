// @ts-nocheck
// Autonomy — the QA Lead reviews each team's day (agent runs, errors, review
// backlog) and delivers a nightly audit to every manager/owner on the team.
// Guarded by CRON_SECRET; service-role client iterates all teams. Returns 501
// until env is configured.
//
// Schedule (vercel.json): { "path": "/api/cron/nightly-audit", "schedule": "0 3 * * *" }
// (03:00 UTC ≈ late-night US). Set CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY.

import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { loadRegistry } from '@/lib/agents/registry'
import { generateNightlyAudit } from '@/lib/agents/brief'

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
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const registry = await loadRegistry(supabase)
  const today = new Date().toISOString().split('T')[0]

  // Teams that saw agent activity in the last day are worth auditing.
  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  const { data: recent } = await supabase.from('agent_runs').select('team_id').gte('started_at', dayAgo).not('team_id', 'is', null)
  const teamIds = [...new Set((recent ?? []).map((r: any) => r.team_id).filter(Boolean))]
  if (!teamIds.length) return NextResponse.json({ teams: 0, audited: 0 })

  const { data: mgrs } = await supabase.from('users').select('id, team_id, role')
    .in('team_id', teamIds).in('role', ['manager', 'owner', 'admin'])
  const byTeam: Record<string, any[]> = {}
  for (const m of mgrs ?? []) (byTeam[m.team_id] ??= []).push(m)

  let audited = 0
  for (const teamId of teamIds) {
    const managers = byTeam[teamId] ?? []
    if (!managers.length) continue
    // Idempotent: skip if this team's managers already have tonight's audit.
    const { count } = await supabase.from('agent_briefs').select('id', { count: 'exact', head: true })
      .eq('team_id', teamId).eq('kind', 'nightly').eq('for_date', today)
    if (count && count > 0) continue
    try {
      const r = await generateNightlyAudit({ supabase, anthropic, registry, teamId, managers })
      if (r) audited++
    } catch { /* one team's failure never blocks the rest */ }
  }
  return NextResponse.json({ teams: teamIds.length, audited })
}
