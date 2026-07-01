// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { completion, stageMeta, PIPELINE_STAGES } from '@/lib/partnerChecklist'
import { computePlan, computeInsight, fmt } from '@/lib/income/engine'
import { COMPETITORS, COMMISSION_COMPARISON } from '@/lib/modules/battle-cards'
import { streamText, routedLabel } from '@/lib/ai/router'

// Compact competitive intel from the Battle Cards module, so the Coach answers
// competitor objections with the real battlecard — one source of truth.
const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, '')
const COMPETITOR_INTEL = `COMPETITOR BATTLE CARDS (when a prospect names a competitor, lead with the edge, then the line to say):
${Object.values(COMPETITORS).map((c: any) => {
  const edge = c.blocks.find((b: any) => /edge|win/i.test(b.tag)) || c.blocks.find((b: any) => b.type === 'YOUR WIN')
  const say = c.blocks.find((b: any) => b.type === 'TALK TRACK')
  return `- ${c.name} (${c.pill}): ${edge ? stripHtml(edge.summary) : ''}${say ? ` — SAY: ${stripHtml(say.summary)}` : ''}`
}).join('\n')}
Commission math: ${stripHtml((COMMISSION_COMPARISON.blocks.find((b: any) => b.type === 'THE MATH') || {}).summary || '')}`

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// One shared "brain": the full user context every coach mode can draw on, so
// chat, drill feedback, and any future goal-planning all reason from the same
// belt level, pipeline funnel, day structure, and recent wins.
async function buildUserContext(supabase, uid: string) {
  const [{ data: userData }, { data: progress }, { data: recentWins }, { data: partners }] = await Promise.all([
    supabase.from('users').select('name, first_name, start_date, settings, team_id').eq('id', uid).single(),
    supabase.from('user_progress')
      .select('total_xp, current_streak, days_active, calls_this_week, demos_this_week, deals_this_month')
      .eq('user_id', uid).single(),
    supabase.from('wins').select('type, description, logged_at')
      .eq('user_id', uid).order('logged_at', { ascending: false }).limit(5),
    supabase.from('partner_onboarding').select('partner_name, stage, checklist, temperature')
      .eq('user_id', uid).order('updated_at', { ascending: false }).limit(20),
  ])
  const { data: goal } = await supabase.from('goals').select('monthly_deal_goal, leads_per_week_goal, close_rate_goal').eq('user_id', uid).maybeSingle()
  // Apex: the team's live AI Team roster, so the coach can reason about
  // which automations are working the funnel (one source of truth, not a guess).
  const { data: autos } = userData?.team_id
    ? await supabase.from('automations').select('id, status, category').eq('team_id', userData.team_id)
    : { data: [] }
  const liveAutos = (autos ?? []).filter((a: any) => a.status === 'live')
  const todayStr = new Date().toISOString().split('T')[0]
  const [{ data: openTasks }, { data: recentNotes }, { data: incomePlanRow }] = await Promise.all([
    supabase.from('tasks').select('title, done, priority, due_date, estimated_minutes, scheduled_day, scheduled_block')
      .eq('user_id', uid).eq('done', false).is('parent_id', null).limit(40),
    supabase.from('notes').select('title, category, tags, updated_at')
      .eq('user_id', uid).eq('archived', false).order('updated_at', { ascending: false }).limit(5),
    supabase.from('income_plans').select('*').eq('user_id', uid).maybeSingle(),
  ])

  // Income & Commission plan — same engine the planner UI uses, so the coach
  // reasons from the BDR's real plan numbers, not guesses.
  let incomeBlock = ''
  if (incomePlanRow) {
    const r = incomePlanRow
    const ip = computePlan({
      target: +r.target, base: +r.base, path: r.path, buffer: r.buffer,
      b2cRate: +r.b2c_rate, b2cChurn: +r.b2c_churn, bwWarmLeads: +r.bw_warm_leads, bwWarmRate: +r.bw_warm_rate, b2cSelfRate: +r.b2c_self_rate,
      bbComm: +r.bb_comm, bbWarmLeads: +r.bb_warm_leads, bbWarmRate: +r.bb_warm_rate, bbSelfRate: +r.bb_self_rate,
    })
    const { data: ci } = await supabase.from('income_checkins').select('contacts, closes, target_contacts').eq('plan_id', r.id)
    const weeks = (ci ?? []).map((w: any) => ({ c: w.contacts, x: w.closes, t: w.target_contacts }))
    const ins = computeInsight(ip, weeks)
    incomeBlock = `\nINCOME PLAN (from the Commission Planner — coach toward these real numbers):
- Income goal ${fmt(ip.target)}/yr (base ${fmt(ip.base)}), ${ip.path === 'b2c' ? 'Direct/B2C' : 'Partner/B2B2C'} path
- Daily target: ${ip.coldDay} cold + ${ip.warmDay} warm contacts/day · ~${(ip.totalWk || ip.coldWk).toLocaleString()} contacts/week
- Projected year-1 ${fmt(ip.y1total)}${ip.goalMonth ? ` · on pace to hit goal ~month ${ip.goalMonth}` : ''}
- Weeks logged: ${weeks.length}${ins ? `\n- Current insight: ${ins.text}` : ''}`
  }

  // Apex goals + AI Team summary — so the coach speaks to the rep's growth
  // engine (leads/week, close-rate target) and the automations actually running.
  const hotCount = (partners ?? []).filter((p: any) => (p.temperature ?? 'cold') === 'hot').length
  const growthBits: string[] = []
  if (goal?.leads_per_week_goal) growthBits.push(`leads/week goal ${goal.leads_per_week_goal}`)
  if (goal?.close_rate_goal) growthBits.push(`close-rate goal ${goal.close_rate_goal}%`)
  const growthBlock = (growthBits.length || autos?.length)
    ? `\nAGENTIC CRM:${growthBits.length ? `\n- Growth goals: ${growthBits.join(' · ')}${hotCount ? ` · ${hotCount} hot leads in pipeline` : ''}` : ''}${autos?.length ? `\n- AI Team: ${liveAutos.length}/${autos.length} automation agents live (${[...new Set(liveAutos.map((a: any) => a.category))].join(', ') || 'none'}). When relevant, point them to Agentic CRM to activate the right agent.` : ''}`
    : ''

  const firstName = userData?.first_name || (userData?.name ?? 'BDR').split(' ')[0]
  const days = progress?.days_active ?? 0
  const belt = days >= 90 ? 'Black' : days >= 70 ? 'Purple' : days >= 50 ? 'Blue' :
    days >= 30 ? 'Green' : days >= 14 ? 'Orange' : days >= 7 ? 'Yellow' : 'White'

  // Pipeline funnel: count partners by stage so the coach can spot bottlenecks.
  const counts: Record<string, number> = {}
  for (const p of partners ?? []) counts[p.stage] = (counts[p.stage] ?? 0) + 1
  const funnel = PIPELINE_STAGES.map(s => `${s.label} ${counts[s.key] ?? 0}`).join(' · ')
  const shift = userData?.settings?.shift

  // Conversion: warm vs cold lead mix + closing rates so the coach can advise on
  // where to focus (e.g. lift cold close rate, or feed the warm pipeline).
  const all = partners ?? []
  const warm = all.filter(p => (p.temperature ?? 'cold') === 'warm')
  const cold = all.filter(p => (p.temperature ?? 'cold') === 'cold')
  const closeRate = (arr) => arr.length ? Math.round(arr.filter(p => p.stage === 'opportunity_won').length / arr.length * 100) : 0
  const conversion = all.length
    ? `${all.length} leads (${warm.length} warm · ${cold.length} cold) — closing rate overall ${closeRate(all)}%, warm ${closeRate(warm)}%, cold ${closeRate(cold)}%`
    : 'no leads tracked yet'

  const block = `ABOUT THIS BDR:
- Name: ${firstName}
- Belt rank: ${belt} Belt (Day ${days})
- Total XP: ${progress?.total_xp ?? 0}
- Current streak: ${progress?.current_streak ?? 0} days
- Calls this week: ${progress?.calls_this_week ?? 0} · Demos this week: ${progress?.demos_this_week ?? 0} · Deals this month: ${progress?.deals_this_month ?? 0}
- Pipeline funnel: ${funnel}
- Conversion: ${conversion}${goal?.monthly_deal_goal ? `\n- Monthly deal goal: ${goal.monthly_deal_goal} (${progress?.deals_this_month ?? 0} closed so far this month) — coach toward this number.` : ''}${shift ? `\n- Works a shift starting ${shift} with an optimized time-blocked day (~4h45m of protected selling time across three power blocks).` : ''}
${recentWins?.length ? `\nRECENT WINS:\n${recentWins.map((w) => `- ${w.type}: ${w.description}`).join('\n')}` : ''}
${partners?.length ? `\nPARTNERS IN ONBOARDING (reference by name when relevant):\n${partners.slice(0, 8).map((p) => `- ${p.partner_name} — ${stageMeta(p.stage).label}, ${completion(p.checklist).done}/${completion(p.checklist).total} onboarding tasks done`).join('\n')}` : ''}${(() => {
  const tasks = openTasks ?? []
  if (!tasks.length) return ''
  const planned = tasks.filter(t => t.scheduled_day === todayStr && t.scheduled_block != null)
  const unplanned = tasks.filter(t => !(t.scheduled_day === todayStr && t.scheduled_block != null))
  const line = (t) => `- ${t.priority ? '' : ''}${t.title}${t.due_date ? ` (due ${t.due_date})` : ''} [~${t.estimated_minutes ?? 30}m]`
  return `\nTASKS — they manage tasks in this app; reference real titles and help them prioritize/time-block:\n- Planned into today's blocks: ${planned.length} · Unplanned: ${unplanned.length}` +
    (planned.length ? `\nTODAY'S PLAN:\n${planned.slice(0, 8).map(line).join('\n')}` : '') +
    (unplanned.length ? `\nTOP UNPLANNED:\n${unplanned.slice(0, 8).map(line).join('\n')}` : '')
})()}${recentNotes?.length ? `\nRECENT NOTES (Plan tab):\n${recentNotes.map(n => `- ${n.title || 'Untitled'}${n.category ? ` [${n.category}]` : ''}`).join('\n')}` : ''}${incomeBlock}${growthBlock}`

  return { firstName, belt, days, block }
}

// Shared ground truth about ConsumerDirect so the AI never invents a different
// business. ConsumerDirect is a CREDIT company with a partner/reseller model —
// NOT a mortgage lender.
const COMPANY_CONTEXT = `ConsumerDirect is a credit technology company. Its products help people understand and improve their credit: SmartCredit (flagship credit monitoring & management), SmartCredito (the Spanish experience), ScoreMaster, B360, The Lending Score, and Hogo.

The sales model is B2B/B2B2C. BDRs do NOT sell mortgages to consumers. They sign PARTNERS — resellers and affiliates such as credit-repair companies, mortgage brokers, financial coaches, and fintechs — who then sponsor or resell ConsumerDirect's credit tools to their own clients. A BDR's job: prospect (Seamless.AI, LinkedIn), qualify fit and need, send a Partnership Order Form in Onit, get it signed via Dropbox Sign, and onboard the partner for their first 12 months before handing off to Account Management.

The pipeline is: New Lead → Interested → Proposal Sent → Contract Signed → Opportunity Won. The team is trained on the Sandler selling method (up-front contracts, the pain funnel, reversing, "don't spill your candy in the lobby"). Common partner objections: "We already have a credit product," "What's the price?", "Now isn't a good time," "I need to think about it." Upsells include Credit Versio, LevelUp Score, ECRYPT, GOAT Payment, myLONA Rev Share, and Business Credit Reporting.

${COMPETITOR_INTEL}`

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, userId, history = [], mode = 'coach', scenario, pageContext } = await request.json()

    // The dock tells us which screen the rep is on. Keep it short + single-line
    // so it can't be used to inject extra instructions into the system prompt.
    const screen = typeof pageContext === 'string' ? pageContext.replace(/[\r\n]+/g, ' ').slice(0, 60).trim() : ''

    // ── Roleplay prospect: AI stays in character as a skeptical partner ──────
    if (mode === 'drill') {
      const sys = `You are roleplaying as a PROSPECT in a sales practice drill for a ConsumerDirect BDR. Stay fully in character — you are the partner being sold to, never the coach.

${COMPANY_CONTEXT}

YOUR CHARACTER: ${scenario?.persona ?? 'the owner of a small credit-repair company'}.
THE SITUATION: ${scenario?.situation ?? 'A BDR has reached out to you about partnering with ConsumerDirect.'}
YOUR DEFAULT STANCE: ${scenario?.objection ?? 'You are busy and mildly skeptical — you need a real reason to keep talking.'}

RULES:
- Respond ONLY as the prospect, in first person. Keep replies short and realistic (1–3 sentences).
- Be a believable human: skeptical but fair. Raise real objections; don't fold instantly, but DO reward genuinely good discovery, empathy, and clear value with measured warmth.
- If the rep is pushy, vague, or pitches features without understanding your business, get more guarded.
- If the rep earns it (uncovers your real pain, sets a clear next step), you may agree to a next step — then add the token "[DRILL_COMPLETE]" at the very end of that message.
- Never coach, never break character, never explain the methodology.`

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 250,
        system: sys,
        messages: [
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ],
      })
      const text = response.content.find((c) => c.type === 'text')?.text ?? '…'
      const complete = text.includes('[DRILL_COMPLETE]')
      return NextResponse.json({ response: text.replace('[DRILL_COMPLETE]', '').trim(), complete })
    }

    // ── Sandler feedback: evaluate a completed roleplay transcript ───────────
    if (mode === 'feedback') {
      const ctx = await buildUserContext(supabase, user.id)
      const sys = `You are a Sandler-trained sales coach at ConsumerDirect reviewing a BDR's practice roleplay against a prospect.

${COMPANY_CONTEXT}

This rep is a ${ctx.belt} Belt (Day ${ctx.days}) — calibrate your expectations and tone to that experience level (encouraging fundamentals for newer belts, sharper nuance for advanced ones).

Evaluate ONLY the BDR's lines (role "user" in the transcript). Be specific and reference the actual words used. Return concise plain text in EXACTLY this shape:

SCORE: X/5
WHAT WORKED:
- <one or two specific things, quoting or paraphrasing what the rep said>
WHAT TO SHARPEN:
- <two or three specific, actionable fixes; cite the relevant Sandler rule by name, e.g. up-front contract, the pain funnel, reversing, "don't spill your candy in the lobby">
TRY THIS NEXT TIME:
- <one concrete line the rep could have used>

Be honest but encouraging. No preamble, no closing.`

      const transcript = history.map((h) => `${h.role === 'user' ? 'BDR' : 'PROSPECT'}: ${h.content}`).join('\n')
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: sys,
        messages: [{ role: 'user', content: `Here is the roleplay transcript:\n\n${transcript}\n\nGive your evaluation.` }],
      })
      const text = response.content.find((c) => c.type === 'text')?.text ?? 'Could not generate feedback.'
      return NextResponse.json({ response: text })
    }

    // ── Default: personalized coach chat ─────────────────────────────────────
    // Always use the server-verified identity, never a client-supplied userId,
    // so a caller can't request another user's data as coaching context.
    const ctx = await buildUserContext(supabase, user.id)

    const systemPrompt = `You are an expert sales coach for BDRs at ConsumerDirect.

${COMPANY_CONTEXT}

${ctx.block}
${screen ? `\nThe rep is currently on the "${screen}" screen of the app. If it's relevant to their question, tailor your help to what they're looking at right now.` : ''}

COACHING STYLE:
- Direct, practical, encouraging. Specific tips, not generic advice.
- Reference their metrics and pipeline funnel when relevant — call out bottlenecks (e.g. partners stuck at Proposal Sent) and name specific partners.
- Use the conversion line to coach on closing: if cold close rate lags warm, push discovery/qualification on cold leads; if the warm pipeline is thin, push prospecting for referrals/inbound. Cite the actual percentages.
- They plan in this app (Notes → Tasks → Time Blocks). When they ask what to do, ground your answer in their REAL tasks above: prioritize by urgency/due/impact, suggest what to time-block now, and tell them to use "Auto-plan my day" on Time Blocks. Reference real task titles.
- Keep it concise (2–4 short paragraphs, bullets for lists).
- Ground advice in ConsumerDirect's partner/credit sales reality and the Sandler method.
- When the rep wants to practice, suggest the Objection Drill.

TAKING ACTION:
When — and only when — the rep clearly asks you to DO something you can perform, first reply normally in one short sentence confirming what you'll set up, then append EXACTLY ONE action directive on its very last line, wrapped in sentinels, as compact JSON:
[[ACTION]]{"type":"...","...":"..."}[[/ACTION]]
The rep will see a confirm button — never claim it's already done. Supported types and fields:
- create_task: { "type":"create_task", "title": string, "due_date"?: "YYYY-MM-DD", "priority"?: boolean }
- create_note: { "type":"create_note", "title": string }
- log_activity: { "type":"log_activity", "activity": "call"|"demo"|"deal" }
- set_goal: { "type":"set_goal", "monthly_deal_goal": number }
- set_followup: { "type":"set_followup", "partner_name": string, "date": "YYYY-MM-DD" }   // partner_name must match one of their partners
Use today's date context if they say "today/tomorrow". If the request is vague or not one of these, do NOT emit a directive — just advise. Only ever emit a directive the rep explicitly asked for.`

    // Stream the coach reply token-by-token via the AI router: the conversational
    // "Ask Coach" engine routes to ChatGPT when OPENAI_API_KEY is set, and falls
    // back to Claude otherwise — same streaming UX either way.
    const readable = await streamText({
      task: 'coach',
      system: systemPrompt,
      maxTokens: 500,
      messages: [
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ],
    })
    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Apex-Model': routedLabel('coach') },
    })
  } catch (error) {
    console.error('Coach API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
