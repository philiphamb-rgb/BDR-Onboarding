// @ts-nocheck
// Cortex — feedback synthesis (interactive trigger). Manager-only: verified
// server-side by role, not just the client. Turns recent team feedback into
// agent-scoped instruction PROPOSALS (pending the manager's approval). The same
// core runs on a schedule via /api/cron/feedback-synthesis.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { synthesizeTeam } from '@/lib/growth/synthesize'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase.from('users').select('role, team_id').eq('id', user.id).single()
    const isManager = ['manager', 'owner'].includes(me?.role ?? 'rep')
    if (!isManager || !me?.team_id) return NextResponse.json({ error: 'Manager access required' }, { status: 403 })

    const { rows, reason } = await synthesizeTeam({ supabase, teamId: me.team_id })
    if (rows.length === 0) return NextResponse.json({ created: 0, reason })

    // Insert via the manager's RLS client (gip_manager_all with_check enforces team).
    const { error } = await supabase.from('growth_instruction_proposals').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ created: rows.length })
  } catch (e) {
    console.error('synthesize error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
