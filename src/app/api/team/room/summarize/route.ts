// @ts-nocheck
// Turns a room's conversation into a structured meeting output: summary,
// decisions, open questions, owners, next actions, deadlines. Persists to
// meeting_outputs and marks the room summarized. Next actions surface in the
// room UI and can be pushed to tasks by the operator.

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

  return NextResponse.json({ output: saved || output })
}
