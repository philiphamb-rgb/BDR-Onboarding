// @ts-nocheck
// Cortex — the scheduled nightly feedback synthesis. Runs the same core as the
// interactive route across every team with recent feedback, inserting pending
// proposals for managers to review each morning. Guarded by CRON_SECRET; uses a
// service-role client so it can iterate all teams.
//
// TODO(integration): set CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY, and schedule it
// (e.g. vercel.json crons: { "path": "/api/cron/feedback-synthesis", "schedule":
// "0 7 * * *" }). Until configured it returns 501 rather than running unguarded.

import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { synthesizeTeam } from '@/lib/growth/synthesize'

export const dynamic = 'force-dynamic'

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
  const since = new Date(Date.now() - 2 * 86400000).toISOString()   // teams active in the last 2 days
  const { data: recent } = await supabase.from('growth_feedback').select('team_id').gte('created_at', since).not('detail', 'is', null)
  const teamIds = [...new Set((recent ?? []).map(r => r.team_id).filter(Boolean))]

  let created = 0
  const perTeam: any[] = []
  for (const teamId of teamIds) {
    const { rows } = await synthesizeTeam({ supabase, teamId })
    if (rows.length) {
      const { error } = await supabase.from('growth_instruction_proposals').insert(rows)
      if (!error) { created += rows.length; perTeam.push({ teamId, created: rows.length }) }
    }
  }
  return NextResponse.json({ teams: teamIds.length, created, perTeam })
}
