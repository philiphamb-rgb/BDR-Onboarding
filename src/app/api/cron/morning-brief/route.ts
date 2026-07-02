// @ts-nocheck
// Autonomy — the Chief of Staff writes every active operator a morning brief,
// grounded in their real pipeline/goals/memory + brand voice. Guarded by
// CRON_SECRET; uses a service-role client to iterate all users and to read each
// operator's data across RLS. Returns 501 until the env is configured, so it is
// never live-but-unguarded.
//
// Schedule (vercel.json): { "path": "/api/cron/morning-brief", "schedule": "0 11 * * *" }
// (11:00 UTC ≈ early morning US). Set CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY.

import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { loadRegistry } from '@/lib/agents/registry'
import { generateMorningBrief } from '@/lib/agents/brief'

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

  // Active operators: anyone with progress in the last ~10 days (don't brief dormant accounts).
  const since = new Date(Date.now() - 10 * 86400000).toISOString()
  const { data: active } = await supabase.from('user_progress').select('user_id').gte('updated_at', since)
  const ids = [...new Set((active ?? []).map((r: any) => r.user_id).filter(Boolean))]
  if (!ids.length) return NextResponse.json({ users: 0, briefed: 0 })

  const { data: users } = await supabase.from('users').select('id, first_name, team_id').in('id', ids)
  const today = new Date().toISOString().split('T')[0]

  let briefed = 0
  for (const user of users ?? []) {
    // Idempotent: skip anyone already briefed today.
    const { count } = await supabase.from('agent_briefs').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('kind', 'morning').eq('for_date', today)
    if (count && count > 0) continue
    try {
      const r = await generateMorningBrief({ supabase, anthropic, user, registry })
      if (r) briefed++
    } catch { /* one user's failure never blocks the rest */ }
  }
  return NextResponse.json({ users: (users ?? []).length, briefed })
}
