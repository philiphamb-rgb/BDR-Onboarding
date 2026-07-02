// @ts-nocheck
// Agentic CRM OS — meeting-room turn endpoint. Given a room + the operator's
// message, generates the right agent responses (1:1 = one agent; team/boardroom
// = the participants, chair synthesizes last; @mentions target specific agents),
// persists each turn to agent_messages, and logs an agent_run for observability.
//
// Model note (decision B5): agents carry a model_tier (worker/manager/exec) for
// future per-tier routing. Until access to the tier-specific models is confirmed
// for this deployment, all turns use a single reliable model (AGENT_MODEL,
// defaulting to the same model the existing coach uses). The tiering is data-
// ready and flips on by mapping model_tier → model when enabled.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { loadRegistry } from '@/lib/agents/registry'
import { buildAgentSystemPrompt } from '@/lib/agents/prompt'
import { buildBusinessContext, brandBlock } from '@/lib/agents/context'

const AGENT_MODEL = process.env.AGENT_MODEL || 'claude-sonnet-4-6'
const MAX_RESPONDERS = 4

export async function POST(req: Request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const { roomId, content } = await req.json()
  if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // RLS guarantees the room belongs to this user (or their team as manager).
  const { data: room } = await supabase.from('meeting_rooms').select('*').eq('id', roomId).maybeSingle()
  if (!room) return NextResponse.json({ error: 'room not found' }, { status: 404 })

  const [{ data: parts }, registry] = await Promise.all([
    supabase.from('meeting_participants').select('agent_id').eq('room_id', roomId),
    loadRegistry(supabase),
  ])
  const participantAgents = (parts ?? []).map((p: any) => registry.byId[p.agent_id]).filter(Boolean)
  if (participantAgents.length === 0) return NextResponse.json({ error: 'no agents in room' }, { status: 400 })

  // Persist the operator's message first (if any).
  if (content && content.trim()) {
    await supabase.from('agent_messages').insert({ room_id: roomId, user_id: user.id, author_type: 'user', author_id: user.id, author_name: 'You', content: content.trim() })
  }

  const { data: history } = await supabase.from('agent_messages')
    .select('author_type, author_name, content').eq('room_id', roomId)
    .order('created_at', { ascending: true }).limit(40)
  const transcript = (history ?? []).map((h: any) => `${h.author_name}: ${h.content}`).join('\n')

  // Decide who responds.
  let responders = participantAgents
  if (room.mode === 'one_on_one') {
    responders = participantAgents.slice(0, 1)
  } else {
    const mentioned = participantAgents.filter((a: any) => new RegExp(`@?\\b${a.firstName}\\b`, 'i').test(content || ''))
    if (mentioned.length) responders = mentioned
    responders = responders.slice(0, MAX_RESPONDERS)
    // Boardroom: the chair speaks last, to synthesize.
    if (room.mode === 'boardroom' && room.chair_agent_id && registry.byId[room.chair_agent_id]) {
      responders = [...responders.filter((a: any) => a.id !== room.chair_agent_id), registry.byId[room.chair_agent_id]]
    }
  }

  const roster = responders.map((r: any) => r.fullName).join(', ')
  const newMsgs: any[] = []

  // Ground the whole room in the operator's real situation + brand once.
  const { context: bizContext, brand } = await buildBusinessContext(supabase, user.id, room.team_id)

  for (const agent of responders) {
    const started = Date.now()
    const roomLine = `This is a ${room.mode.replace(/_/g, ' ')}${room.topic ? ` about "${room.topic}"` : ''}. Participants: ${roster}.`
    const system = buildAgentSystemPrompt(agent, `${roomLine}\n${bizContext}`, brandBlock(brand, agent.brandVoiceOverride))
    const soFar = newMsgs.length ? `\n${newMsgs.map(m => `${m.author_name}: ${m.content}`).join('\n')}` : ''
    const userTurn = `Conversation so far:\n${transcript}${soFar}\n\nNow respond as ${agent.firstName}. If this isn't your area, say so briefly and name who should take it.`
    let text = ''
    let error: string | null = null
    try {
      const resp = await anthropic.messages.create({ model: AGENT_MODEL, max_tokens: 420, system, messages: [{ role: 'user', content: userTurn }] })
      text = (resp.content?.[0]?.text || '').trim()
    } catch (e: any) {
      error = e?.message || 'generation failed'
    }
    await supabase.from('agent_runs').insert({
      agent_id: agent.id, user_id: user.id, team_id: room.team_id, room_id: roomId,
      trigger: 'meeting', status: error ? 'error' : 'ok', model: AGENT_MODEL,
      input: { topic: room.topic }, output: { chars: text.length }, error,
      ended_at: new Date().toISOString(),
    })
    if (!text) continue
    const { data: inserted } = await supabase.from('agent_messages')
      .insert({ room_id: roomId, user_id: user.id, author_type: 'agent', author_id: agent.id, author_name: agent.firstName, content: text })
      .select('*').maybeSingle()
    newMsgs.push(inserted || { author_type: 'agent', author_id: agent.id, author_name: agent.firstName, content: text })
  }

  await supabase.from('meeting_rooms').update({ updated_at: new Date().toISOString() }).eq('id', roomId)
  return NextResponse.json({ messages: newMsgs })
}
