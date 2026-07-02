// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// A meeting room. The operator talks; the room's agents respond (1:1 = one;
// team/boardroom = several, chair last). "Wrap up" turns the conversation into a
// structured meeting output (summary, decisions, next actions) and can push the
// next actions into tasks. Messages persist to agent_messages.

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createUntypedClient } from '@/lib/supabase/untyped'
import { Card, Skeleton, toast, Button } from '@/components/ui'
import { BackIcon, ArrowRightIcon, CoachIcon, CheckIcon, ChecklistIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export default function RoomPage() {
  const supabase = createUntypedClient()
  const { id } = useParams<{ id: string }>()
  const [room, setRoom] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [participants, setParticipants] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [output, setOutput] = useState<any>(null)
  const [wrapping, setWrapping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    const [{ data: r }, { data: msgs }, { data: parts }, { data: out }] = await Promise.all([
      supabase.from('meeting_rooms').select('*').eq('id', id).maybeSingle(),
      supabase.from('agent_messages').select('*').eq('room_id', id).order('created_at', { ascending: true }),
      supabase.from('meeting_participants').select('agent_id').eq('room_id', id),
      supabase.from('meeting_outputs').select('*').eq('room_id', id).order('created_at', { ascending: false }).limit(1),
    ])
    setRoom(r); setMessages(msgs ?? []); setParticipants((parts ?? []).map((p: any) => p.agent_id))
    setOutput((out ?? [])[0] ?? null); setLoading(false)
  }
  useEffect(() => { load() }, [id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  const send = async () => {
    const content = input.trim()
    if (!content || thinking) return
    setInput('')
    setMessages(m => [...m, { id: `tmp-${Date.now()}`, author_type: 'user', author_name: 'You', content }])
    setThinking(true)
    try {
      const res = await fetch('/api/team/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: id, content }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'failed')
      await load()
    } catch (e: any) {
      toast.error(`Couldn't get a reply. ${e.message || ''}`)
    } finally { setThinking(false) }
  }

  const wrapUp = async () => {
    if (wrapping) return
    setWrapping(true)
    try {
      const res = await fetch('/api/team/room/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      setOutput(data.output)
      toast.success('Meeting wrapped up')
    } catch (e: any) {
      toast.error(`Couldn't summarize. ${e.message || ''}`)
    } finally { setWrapping(false) }
  }

  if (loading) return <div className="space-y-3"><Skeleton className="h-10 rounded-xl" />{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
  if (!room) return <Card className="!py-10 text-center"><p className="text-[13px] text-gray">Room not found.</p><Link href="/team/rooms" className="mt-3 inline-block text-[13px] font-[700] text-teal">← Back to meetings</Link></Card>

  const modeLabel: Record<string, string> = { one_on_one: '1:1 Chat', team: 'Team Chat', boardroom: 'Boardroom', war_room: 'War Room', office_hours: 'Office Hours' }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <Link href="/team/rooms" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-gray"><BackIcon size={16} /></Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-[900] text-dark-text">{room.topic || modeLabel[room.mode]}</div>
          <div className="text-[11px] text-gray">{modeLabel[room.mode]} · {participants.length} in the room</div>
        </div>
        {messages.length > 1 && <button onClick={wrapUp} disabled={wrapping} className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-[12px] font-[800] text-white disabled:opacity-60">{wrapping ? 'Wrapping…' : 'Wrap up'}</button>}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-bdrbg/40 p-3">
        {messages.length === 0 && <p className="py-8 text-center text-[13px] text-gray">Say hello, or ask the room a question to begin.</p>}
        {messages.map(m => {
          const mine = m.author_type === 'user'
          return (
            <div key={m.id} className={cn('flex gap-2.5', mine && 'flex-row-reverse')}>
              {!mine && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/8 text-[11px] font-[800] text-navy-ink">{(m.author_name || 'A').slice(0, 2)}</span>}
              <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2.5', mine ? 'bg-teal text-white' : 'bg-card shadow-card')}>
                {!mine && <div className="mb-0.5 text-[11px] font-[800] text-navy-ink">{m.author_name}</div>}
                <div className={cn('whitespace-pre-wrap text-[13px] leading-relaxed', mine ? 'text-white' : 'text-dark-text')}>{m.content}</div>
              </div>
            </div>
          )
        })}
        {thinking && <div className="flex items-center gap-2 px-1 text-[12px] text-gray"><CoachIcon size={14} className="animate-pulse text-teal" /> the room is thinking…</div>}
        <div ref={endRef} />
      </div>

      {/* Meeting output */}
      {output && (
        <Card className="mt-2 !p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-[800] uppercase tracking-wide text-teal"><ChecklistIcon size={13} /> Meeting summary</div>
          {output.summary && <p className="mb-2 text-[12.5px] leading-relaxed text-mid-text">{output.summary}</p>}
          {Array.isArray(output.decisions) && output.decisions.length > 0 && (
            <div className="mb-2"><div className="text-[10px] font-[800] uppercase tracking-wide text-gray">Decisions</div>{output.decisions.map((d: string, i: number) => <div key={i} className="flex gap-1.5 text-[12px] text-mid-text"><CheckIcon size={12} className="mt-1 shrink-0 text-success" />{d}</div>)}</div>
          )}
          {Array.isArray(output.next_actions) && output.next_actions.length > 0 && (
            <div><div className="text-[10px] font-[800] uppercase tracking-wide text-gray">Next actions</div>{output.next_actions.map((d: string, i: number) => <div key={i} className="flex gap-1.5 text-[12px] text-mid-text"><ArrowRightIcon size={12} className="mt-1 shrink-0 text-teal" />{d}</div>)}</div>
          )}
        </Card>
      )}

      {/* Composer */}
      <div className="mt-2 flex gap-2">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1} placeholder="Message the room…" className="flex-1 resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] outline-none focus:border-navy/40" />
        <Button onClick={send} disabled={thinking || !input.trim()}>Send</Button>
      </div>
    </div>
  )
}
