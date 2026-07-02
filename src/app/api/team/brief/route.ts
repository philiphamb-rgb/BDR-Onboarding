// @ts-nocheck
// On-demand morning brief for the signed-in operator. Same generator the cron
// runs, but keyed to the current user's own session — so the Chief of Staff can
// brief you the instant you ask, without waiting for the scheduled run (and
// without any service-role config). RLS lets a user read/insert only their own.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { loadRegistry } from '@/lib/agents/registry'
import { generateMorningBrief } from '@/lib/agents/brief'

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Your Chief of Staff can't write a brief yet — add ANTHROPIC_API_KEY in your deployment settings." }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('first_name, team_id').eq('id', user.id).maybeSingle()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const registry = await loadRegistry(supabase)

  await generateMorningBrief({
    supabase, anthropic, registry,
    user: { id: user.id, first_name: profile?.first_name, team_id: profile?.team_id ?? null },
  })

  // Return the freshest brief for the client to render.
  const { data } = await supabase.from('agent_briefs').select('id, title, body, for_date, is_read')
    .eq('user_id', user.id).eq('kind', 'morning').order('created_at', { ascending: false }).limit(1)
  return NextResponse.json({ brief: data?.[0] ?? null })
}
