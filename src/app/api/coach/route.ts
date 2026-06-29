// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { completion, stageMeta } from '@/lib/partnerChecklist'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Shared ground truth about ConsumerDirect so the AI never invents a different
// business. ConsumerDirect is a CREDIT company with a partner/reseller model —
// NOT a mortgage lender.
const COMPANY_CONTEXT = `ConsumerDirect is a credit technology company. Its products help people understand and improve their credit: SmartCredit (flagship credit monitoring & management), SmartCredito (the Spanish experience), ScoreMaster, B360, The Lending Score, and Hogo.

The sales model is B2B/B2B2C. BDRs do NOT sell mortgages to consumers. They sign PARTNERS — resellers and affiliates such as credit-repair companies, mortgage brokers, financial coaches, and fintechs — who then sponsor or resell ConsumerDirect's credit tools to their own clients. A BDR's job: prospect (Seamless.AI, LinkedIn), qualify fit and need, send a Partnership Order Form in Onit, get it signed via Dropbox Sign, and onboard the partner for their first 12 months before handing off to Account Management.

The pipeline is: New Lead → Interested → Proposal Sent → Contract Signed → Opportunity Won. The team is trained on the Sandler selling method (up-front contracts, the pain funnel, reversing, "don't spill your candy in the lobby"). Common partner objections: "We already have a credit product," "What's the price?", "Now isn't a good time," "I need to think about it." Upsells include Credit Versio, LevelUp Score, ECRYPT, GOAT Payment, myLONA Rev Share, and Business Credit Reporting.`

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, userId, history = [], mode = 'coach', scenario } = await request.json()

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
      const sys = `You are a Sandler-trained sales coach at ConsumerDirect reviewing a BDR's practice roleplay against a prospect.

${COMPANY_CONTEXT}

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
    const uid = user.id
    const { data: userData } = await supabase
      .from('users').select('name, first_name, start_date').eq('id', uid).single()
    const { data: progress } = await supabase
      .from('user_progress')
      .select('total_xp, current_streak, days_active, calls_this_week, demos_this_week, deals_this_month')
      .eq('user_id', uid).single()
    const { data: recentWins } = await supabase
      .from('wins').select('type, description, logged_at')
      .eq('user_id', uid).order('logged_at', { ascending: false }).limit(5)
    const { data: partners } = await supabase
      .from('partner_onboarding').select('partner_name, stage, checklist')
      .eq('user_id', uid).order('updated_at', { ascending: false }).limit(8)

    const firstName = userData?.first_name || (userData?.name ?? 'BDR').split(' ')[0]
    const days = progress?.days_active ?? 0
    const belt = days >= 90 ? 'Black' : days >= 70 ? 'Purple' : days >= 50 ? 'Blue' :
      days >= 30 ? 'Green' : days >= 14 ? 'Orange' : days >= 7 ? 'Yellow' : 'White'

    const systemPrompt = `You are an expert sales coach for BDRs at ConsumerDirect.

${COMPANY_CONTEXT}

ABOUT THIS BDR:
- Name: ${firstName}
- Belt rank: ${belt} Belt (Day ${days})
- Total XP: ${progress?.total_xp ?? 0}
- Current streak: ${progress?.current_streak ?? 0} days
- Calls this week: ${progress?.calls_this_week ?? 0}
- Demos this week: ${progress?.demos_this_week ?? 0}
- Deals this month: ${progress?.deals_this_month ?? 0}
${recentWins?.length ? `\nRECENT WINS:\n${recentWins.map((w) => `- ${w.type}: ${w.description}`).join('\n')}` : ''}
${partners?.length ? `\nPARTNERS IN ONBOARDING (reference by name when relevant):\n${partners.map((p) => `- ${p.partner_name} — ${stageMeta(p.stage).label}, ${completion(p.checklist).done}/${completion(p.checklist).total} onboarding tasks done`).join('\n')}` : ''}

COACHING STYLE:
- Direct, practical, encouraging. Specific tips, not generic advice.
- Reference their metrics when relevant. Keep it concise (2–4 short paragraphs, bullets for lists).
- Ground advice in ConsumerDirect's partner/credit sales reality and the Sandler method.
- When the rep wants to practice, suggest the Objection Drill.`

    // Stream the coach reply token-by-token for a live typing experience.
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      stream: true,
      messages: [
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ],
    })
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        } catch {
          controller.enqueue(encoder.encode("\n\n(Connection interrupted — please try again.)"))
        } finally {
          controller.close()
        }
      },
    })
    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (error) {
    console.error('Coach API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
