// @ts-nocheck
// /api/automations/checkin-notify
//
// Target for a Supabase Database Webhook on INSERT into income_checkins
// (Database → Webhooks). Fires server-side from the DB itself, so it can't be
// skipped by a closed tab or a flaky request. Posts a pace summary to Slack AND
// drops an in-app notification (the bell) on streak milestones — native, not a
// side channel. No-ops safely until the secrets + webhook are configured.
//
// Required env (Vercel project settings): SUPABASE_WEBHOOK_SECRET,
// SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL. Optional: SLACK_WEBHOOK_URL.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computePlan, trackerSummary, fmt } from '@/lib/income/engine'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (!process.env.SUPABASE_WEBHOOK_SECRET || secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ ok: true, skipped: 'no service role' })

  const payload = await req.json().catch(() => null)
  const rec = payload?.record
  if (!rec?.user_id || !rec?.plan_id) return NextResponse.json({ ok: true })
  const { user_id, plan_id, contacts, closes, target_contacts, week_number } = rec

  const admin = createClient(url, key, { auth: { persistSession: false } })
  const [{ data: planRow }, { data: userRow }, { data: priorCheckins }] = await Promise.all([
    admin.from('income_plans').select('*').eq('id', plan_id).single(),
    admin.from('users').select('name, first_name').eq('id', user_id).single(),
    admin.from('income_checkins').select('contacts, closes, target_contacts').eq('user_id', user_id).lte('week_number', week_number).order('week_number'),
  ])
  if (!planRow) return NextResponse.json({ ok: true })

  const plan = computePlan({
    target: +planRow.target, base: +planRow.base, path: planRow.path, buffer: planRow.buffer,
    b2cRate: +planRow.b2c_rate, b2cChurn: +planRow.b2c_churn, bwWarmLeads: +planRow.bw_warm_leads, bwWarmRate: +planRow.bw_warm_rate, b2cSelfRate: +planRow.b2c_self_rate,
    bbComm: +planRow.bb_comm, bbWarmLeads: +planRow.bb_warm_leads, bbWarmRate: +planRow.bb_warm_rate, bbSelfRate: +planRow.bb_self_rate,
  })
  const checkIns = (priorCheckins ?? []).map((r: any) => ({ c: r.contacts, x: r.closes, t: r.target_contacts }))
  const stats = trackerSummary(plan, checkIns)
  const name = userRow?.name ?? 'A BDR'
  const onPace = stats.deficit <= 0
  const statusEmoji = onPace ? '🟢' : stats.deficit < target_contacts * 0.5 ? '🟡' : '🔴'

  // In-app notification (the bell) on streak milestones — celebratory, low-noise.
  if ([3, 6, 10].includes(stats.streak)) {
    await admin.from('notifications').insert({
      user_id, type: 'streak', title: `🔥 ${stats.streak}-week pace streak!`,
      body: `You've hit your weekly contact target ${stats.streak} weeks running. Consistency is what turns your plan into ${fmt(plan.target)}.`,
    }).then(() => {}, () => {})
  }

  // Slack (team channel) — only if configured.
  if (process.env.SLACK_WEBHOOK_URL) {
    const text = [
      `${statusEmoji} *${name}* logged Week ${week_number}: ${contacts} contacts, ${closes} closes (target ${target_contacts}).`,
      onPace ? `On pace${stats.deficit < 0 ? `, ${-stats.deficit} ahead` : ''} — ${stats.actual.toLocaleString()} of ${stats.expected.toLocaleString()} contacts so far.`
        : `${stats.deficit.toLocaleString()} contacts behind across ${stats.n} weeks.`,
      stats.streak >= 2 ? `🔥 ${stats.streak}-week streak.` : '',
    ].filter(Boolean).join('\n')
    await fetch(process.env.SLACK_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
