// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Chat & Boardroom — start a meeting with your AI team. Pick a mode, pick who's
// in the room, and go. Boardrooms/war rooms auto-appoint the Chief of Staff as
// chair. Existing rooms are listed to resume. Supports ?agent=<id> to jump
// straight into a 1:1 from the Agent Office.

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createUntypedClient } from '@/lib/supabase/untyped'
import { Card, Skeleton, toast, Button } from '@/components/ui'
import { GrowthSlimHeader } from '@/components/growth/GrowthChrome'
import { loadRegistry } from '@/lib/agents/registry'
import { useRooms, ROOM_MODES } from '@/lib/hooks/useRooms'
import { CoachIcon, ArrowRightIcon, CheckIcon, TeamIcon, PlusIcon } from '@/components/icons'
import { cn, formatRelativeTime } from '@/lib/utils'

const CHAIR_ID = 'daily-briefing' // Chief of Staff

export default function RoomsPage() {
  const supabase = createUntypedClient()
  const router = useRouter()
  const params = useSearchParams()
  const { loading, rooms, createRoom } = useRooms()
  const [reg, setReg] = useState<any>(null)
  const [mode, setMode] = useState('one_on_one')
  const [topic, setTopic] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => { loadRegistry(supabase).then(setReg) }, [supabase])

  // Deep-link: ?agent=<id> preselects a 1:1 with that agent.
  useEffect(() => {
    const a = params.get('agent')
    if (a && reg?.byId[a]) { setMode('one_on_one'); setPicked([a]) }
  }, [params, reg])

  const agents = reg?.agents ?? []
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return agents.filter((a: any) => !term || a.fullName.toLowerCase().includes(term) || a.role?.title?.toLowerCase().includes(term))
  }, [agents, q])

  const single = mode === 'one_on_one'
  const toggle = (id: string) => setPicked(p => single ? [id] : (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))

  const start = async () => {
    if (!picked.length) { toast.error('Pick at least one teammate'); return }
    setBusy(true)
    const chairId = ROOM_MODES.find(m => m.k === mode)?.chair ? CHAIR_ID : null
    const agentIds = chairId && !picked.includes(chairId) ? [...picked, chairId] : picked
    const res = await createRoom({ mode, topic, agentIds, chairId })
    setBusy(false)
    if (res.error) { toast.error(res.error); return }
    router.push(`/team/rooms/${res.id}`)
  }

  const modeLabel = (m: string) => ROOM_MODES.find(x => x.k === m)?.label || m

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthSlimHeader title="Meet your team" subtitle="Chat 1:1, gather a group, or run a boardroom" />

      {/* Composer */}
      <Card className="!p-4">
        <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {ROOM_MODES.map(m => (
            <button key={m.k} onClick={() => { setMode(m.k); if (m.k === 'one_on_one') setPicked(p => p.slice(0, 1)) }} title={m.help}
              className={cn('rounded-lg border px-2 py-2 text-[11.5px] font-[800]', mode === m.k ? 'border-navy bg-navy text-white' : 'border-border text-gray hover:text-navy-ink')}>{m.label}</button>
          ))}
        </div>
        <div className="mb-1 text-[11px] leading-relaxed text-gray">{ROOM_MODES.find(m => m.k === mode)?.help}{ROOM_MODES.find(m => m.k === mode)?.chair && ' · Chief of Staff chairs.'}</div>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What's this about? (optional)" className="mb-3 w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" />

        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-[800] uppercase tracking-wide text-gray">{single ? 'Pick a teammate' : `Pick teammates (${picked.length})`}</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="w-32 rounded-lg border border-border bg-card px-2.5 py-1 text-[12px] outline-none focus:border-navy/40" />
        </div>
        {!reg ? <Skeleton className="h-24 rounded-xl" /> : (
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border bg-bdrbg p-1.5">
            {filtered.map((a: any) => {
              const on = picked.includes(a.id)
              return (
                <button key={a.id} onClick={() => toggle(a.id)} className={cn('flex w-full items-center gap-2.5 rounded-lg p-2 text-left', on ? 'bg-teal/10' : 'hover:bg-card')}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-[800]', on ? 'bg-teal text-white' : 'bg-navy/8 text-navy-ink')}>{on ? <CheckIcon size={14} /> : `${a.firstName[0]}${a.lastName[0]}`}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-[700] text-dark-text">{a.fullName}</span><span className="block truncate text-[11px] text-gray">{a.role?.title}</span></span>
                </button>
              )
            })}
          </div>
        )}
        <Button onClick={start} disabled={busy || !picked.length} className="mt-3 w-full">{busy ? 'Starting…' : `Start ${modeLabel(mode)}`}</Button>
      </Card>

      {/* Existing rooms */}
      <div>
        <div className="mb-2 px-0.5 text-[11px] font-[800] uppercase tracking-wide text-gray">Recent rooms</div>
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
        ) : rooms.length === 0 ? (
          <Card className="!py-8 text-center"><TeamIcon size={20} className="mx-auto mb-2 text-gray" /><p className="text-[13px] text-gray">No meetings yet — start one above.</p></Card>
        ) : (
          <div className="space-y-2">
            {rooms.map(r => (
              <Link key={r.id} href={`/team/rooms/${r.id}`}>
                <Card hover className="flex items-center gap-3 !p-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/8 text-navy-ink"><CoachIcon size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-[800] text-dark-text">{r.topic || modeLabel(r.mode)}</div>
                    <div className="text-[11px] text-gray">{modeLabel(r.mode)} · {formatRelativeTime(new Date(r.updated_at))}{r.status === 'summarized' ? ' · summarized' : ''}</div>
                  </div>
                  <ArrowRightIcon size={15} className="shrink-0 text-gray" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
