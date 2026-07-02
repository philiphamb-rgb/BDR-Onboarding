// @ts-nocheck
// Turns a room's conversation into a structured meeting output: summary,
// decisions, open questions, owners, next actions, deadlines. Persists to
// meeting_outputs and marks the room summarized. Next actions are also turned
// into real tasks automatically, so a decision in the room becomes execution.

export const dynamic = 'force-dynamic'
export const maxDuration = 45

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const AGENT_MODEL = process.env.AGENT_MODEL || 'claude-sonnet-4-6'

export async function POST(req: Request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const { roomId } = await req.json()
  if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: room } = await supabase.from('meeting_rooms').select('*').eq('id', roomId).maybeSingle()
  if (!room) return NextResponse.json({ error: 'room not found' }, { status: 404 })

  const { data: msgs } = await supabase.from('agent_messages')
    .select('author_name, content').eq('room_id', roomId).order('created_at', { ascending: true }).limit(80)
  const transcript = (msgs ?? []).map((m: any) => `${m.author_name}: ${m.content}`).join('\n')
  if (!transcript.trim()) return NextResponse.json({ error: 'nothing to summarize' }, { status: 400 })

  const system = `You summarize a working meeting for a busy operator. Return STRICT JSON only, no prose, matching:
{"summary": string, "decisions": string[], "open_questions": string[], "owners": string[], "next_actions": string[], "deadlines": string[]}
Be concrete and brief. next_actions must be specific and doable. Empty arrays are fine. Do not invent decisions that were not made.`

  let parsed: any = null
  try {
    const resp = await anthropic.messages.create({
      model: AGENT_MODEL, max_tokens: 700, system,
      messages: [{ role: 'user', content: `Meeting topic: ${room.topic || room.mode}\n\nTranscript:\n${transcript}\n\nReturn the JSON.` }],
    })
    const text = (resp.content?.[0]?.text || '').trim()
    const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    parsed = JSON.parse(jsonStr)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'summary failed' }, { status: 502 })
  }

  const clean = (x: any) => Array.isArray(x) ? x.filter(v => typeof v === 'string' && v.trim()).slice(0, 20) : []
  const output = {
    room_id: roomId, user_id: user.id,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    decisions: clean(parsed.decisions), open_questions: clean(parsed.open_questions),
    owners: clean(parsed.owners), next_actions: clean(parsed.next_actions), deadlines: clean(parsed.deadlines),
  }
  const { data: saved } = await supabase.from('meeting_outputs').insert(output).select('*').maybeSingle()
  await supabase.from('meeting_rooms').update({ status: 'summarized', updated_at: new Date().toISOString() }).eq('id', roomId)

  // Autonomy: turn the meeting's next actions into real tasks the operator can
  // work and time-block — so a decision in the room becomes execution, not a note
  // that dies in a summary. Tagged 'meeting' + categorized so they're traceable.
  let tasksCreated = 0
  if (output.next_actions.length) {
    const tag = `Meeting${room.topic ? `: ${room.topic}` : ''}`.slice(0, 80)
    const rows = output.next_actions.slice(0, 12).map((title: string, i: number) => ({
      user_id: user.id, title: title.slice(0, 200),
      notes: `From AI meeting${room.topic ? ` "${room.topic}"` : ''} on ${new Date().toISOString().split('T')[0]}.`,
      category: 'meeting', tags: [tag], order_index: i,
    }))
    const { data: made } = await supabase.from('tasks').insert(rows).select('id')
    tasksCreated = made?.length ?? 0
  }

  return NextResponse.json({ output: saved || output, tasksCreated })
}
