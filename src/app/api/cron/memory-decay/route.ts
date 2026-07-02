// @ts-nocheck
// Nightly memory decay — calls recompute_memory_decay() so unreinforced learnings
// slowly lose trust and age out of the playbook, keeping the team's memory honest
// about what's still working. Guarded by CRON_SECRET; uses the service-role client
// so the SECURITY DEFINER function runs across all teams. 501 until configured.
//
// Schedule (vercel.json): { "path": "/api/cron/memory-decay", "schedule": "0 4 * * *" }

import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

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
  const { data, error } = await supabase.rpc('recompute_memory_decay')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const row = Array.isArray(data) ? data[0] : data
  return NextResponse.json({ ok: true, touched: row?.touched ?? 0, deprecated: row?.deprecated ?? 0 })
}
