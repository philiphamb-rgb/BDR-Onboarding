// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Content Studio — Idea Bank (Phase 1.5). Capture content ideas, write a script
// with the coach, save it, and track status idea → scripted → posted. Real
// persistence on content_ideas + scripts. Phase 3 expands this into the full
// studio (post builder, repurposing, social proof, performance).

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, Modal, Skeleton, toast, Button } from '@/components/ui'
import { PlusIcon, EditIcon, TrashIcon, IntegrationIcon, CheckIcon, ArrowRightIcon, LightningIcon } from '@/components/icons'
import { useContent } from '@/lib/hooks/useContent'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

const STATUS = [
  { k: 'idea', label: 'Ideas' }, { k: 'scripted', label: 'Scripted' },
  { k: 'posted', label: 'Posted' }, { k: 'all', label: 'All' },
]
const STATUS_TONE: Record<string, string> = { idea: 'bg-bdrbg text-gray', scripted: 'bg-teal/10 text-teal', posted: 'bg-success/10 text-success', archived: 'bg-bdrbg text-gray' }
const FORMATS = ['reel', 'carousel', 'text', 'story', 'vsl', 'thread']
const BUCKETS = ['Claude tutorial', 'AI for leads', 'AI for content', 'Partner monetization', 'Proof / win', 'Opinion']

export default function StudioPage() {
  const { loading, ideas, createIdea, updateIdea, removeIdea, saveScript, scriptFor } = useContent()
  const [filter, setFilter] = useState('idea')
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<any>(null)   // idea open in the script drawer

  const shown = useMemo(() => filter === 'all' ? ideas : ideas.filter(i => i.status === filter), [ideas, filter])
  const counts = (k: string) => k === 'all' ? ideas.length : ideas.filter(i => i.status === k).length

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-dark-text">Content Studio</h1>
          <p className="mt-0.5 text-[13px] text-gray">Capture an idea, write the script, ship it. Two a day keeps the funnel full.</p>
        </div>
        <Link href="/grow/content" className="hidden shrink-0 items-center gap-1 rounded-pill border border-border bg-card px-3 py-2 text-[12px] font-[700] text-navy-ink shadow-card hover:border-navy/40 desktop:flex"><LightningIcon size={15} /> Next Move</Link>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS.map(s => (
          <button key={s.k} onClick={() => setFilter(s.k)} className={cn('rounded-full border px-3 py-1 text-[11.5px] font-[700]', filter === s.k ? 'border-navy bg-navy text-white' : 'border-border text-gray')}>{s.label} <span className={filter === s.k ? 'text-white/70' : 'text-gray/60'}>({counts(s.k)})</span></button>
        ))}
        <button onClick={() => setAdding(true)} className="ml-auto flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-[12px] font-[800] text-white"><PlusIcon size={13} /> New idea</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <Card className="!py-10 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bdrbg text-gray"><EditIcon size={22} /></span>
          <h2 className="text-[15px] font-[800] text-dark-text">No {filter === 'all' ? 'ideas' : filter} yet</h2>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-gray">Capture your first idea — or ask your coach for today's two best.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-[13px] font-[800] text-white"><PlusIcon size={14} /> New idea</button>
            <button onClick={() => askCoach('Give me my two best content ideas to post today to attract business partners, each with a hook and the format. Keep them on-brand for a Claude and AI education creator.')} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[13px] font-[700] text-teal"><IntegrationIcon size={14} /> Ask coach</button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {shown.map(idea => {
            const hasScript = Boolean(scriptFor(idea.id))
            return (
              <Card key={idea.id} hover className="!p-3.5 cursor-pointer" onClick={() => setOpen(idea)}>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13.5px] font-[800] text-dark-text">{idea.title}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-[800] capitalize', STATUS_TONE[idea.status])}>{idea.status}</span>
                    </div>
                    {idea.hook && <p className="mt-0.5 truncate text-[11.5px] italic text-gray">“{idea.hook}”</p>}
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-gray">
                      {idea.format && <span className="rounded bg-bdrbg px-1.5 py-0.5 capitalize">{idea.format}</span>}
                      {idea.channel && <span className="rounded bg-bdrbg px-1.5 py-0.5">{idea.channel === 'faceless' ? 'No-Camera' : 'Face'}</span>}
                      {idea.bucket && <span className="rounded bg-bdrbg px-1.5 py-0.5">{idea.bucket}</span>}
                    </div>
                  </div>
                  {hasScript && <span className="shrink-0 rounded-md bg-teal/10 px-2 py-1 text-[10px] font-[800] text-teal">Script ✓</span>}
                  <ArrowRightIcon size={15} className="shrink-0 text-gray" />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {adding && (
        <IdeaModal onClose={() => setAdding(false)} onSave={async (v) => {
          const res = await createIdea({ ...v, source: 'manual', status: 'idea' })
          if (res.error) { toast.error(`Couldn't save. ${res.error}`); return }
          toast.success('Idea captured'); setAdding(false)
        }} />
      )}

      {open && (
        <ScriptDrawer
          idea={open}
          script={scriptFor(open.id)}
          onClose={() => setOpen(null)}
          onSaveScript={async (body) => {
            const res = await saveScript(open.id, body, scriptFor(open.id))
            if (res.error) { toast.error(`Couldn't save. ${res.error}`); return false }
            toast.success('Script saved'); return true
          }}
          onStatus={async (status) => { await updateIdea(open.id, { status }); toast.success(`Marked ${status}`); setOpen(null) }}
          onDelete={async () => { await removeIdea(open.id); toast.success('Deleted'); setOpen(null) }}
        />
      )}
    </div>
  )
}

function IdeaModal({ onClose, onSave }: any) {
  const [v, setV] = useState({ title: '', hook: '', format: 'reel', channel: 'face', bucket: '' })
  const [busy, setBusy] = useState(false)
  const set = (k: string, val: any) => setV(prev => ({ ...prev, [k]: val }))
  const field = (label: string, node: any) => <label className="block"><span className="mb-1 block text-[11px] font-[700] text-gray">{label}</span>{node}</label>
  const input = (k: string) => <input value={v[k]} onChange={e => set(k, e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" />
  const submit = async () => { if (!v.title.trim()) { toast.error('Title is required'); return } setBusy(true); await onSave({ title: v.title.trim(), hook: v.hook || null, format: v.format, channel: v.channel, bucket: v.bucket || null }); setBusy(false) }
  return (
    <Modal isOpen title="New idea" onClose={onClose}>
      <div className="space-y-3">
        {field('What is the idea?', input('title'))}
        {field('Hook (optional)', input('hook'))}
        <div className="grid grid-cols-3 gap-3">
          {field('Format', <select value={v.format} onChange={e => set('format', e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] capitalize outline-none">{FORMATS.map(f => <option key={f} value={f}>{f}</option>)}</select>)}
          {field('Channel', <select value={v.channel} onChange={e => set('channel', e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none"><option value="face">Face</option><option value="faceless">No-Camera</option></select>)}
          {field('Pillar', <select value={v.bucket} onChange={e => set('bucket', e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none"><option value="">—</option>{BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}</select>)}
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-[12.5px] font-[700] text-gray">Cancel</button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Capture'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function ScriptDrawer({ idea, script, onClose, onSaveScript, onStatus, onDelete }: any) {
  const [body, setBody] = useState(script?.body ?? '')
  const [busy, setBusy] = useState(false)
  const genPrompt = `Write a complete, ready-to-record ${idea.format || 'reel'} script for this content idea aimed at attracting business partners for a Claude and AI education creator: "${idea.title}"${idea.hook ? ` (hook: ${idea.hook})` : ''}. Strong hook in the first 2 seconds, beat-by-beat structure, on-screen text cues, and a clear CTA. Keep it in a confident, practical creator voice. Compliant — no guaranteed financial outcomes.`

  return (
    <Modal isOpen title={idea.title} onClose={onClose} size="lg">
      <div className="space-y-3">
        {idea.hook && <p className="text-[12.5px] italic text-gray">“{idea.hook}”</p>}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => askCoach(genPrompt)} className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-[12px] font-[800] text-white"><IntegrationIcon size={13} /> Write script with AI</button>
          <span className="flex items-center text-[11px] text-gray">Then paste it below and save.</span>
        </div>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={12} placeholder="Paste or write your script here…"
          className="w-full rounded-lg border border-border bg-card p-3 text-[13px] leading-relaxed outline-none focus:border-navy/40" />
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onDelete} className="flex items-center gap-1 rounded-lg border border-error/30 px-3 py-2 text-[12px] font-[700] text-error"><TrashIcon size={13} /> Delete</button>
          {idea.status !== 'posted' && <button onClick={() => onStatus('posted')} className="flex items-center gap-1 rounded-lg border border-success/40 px-3 py-2 text-[12px] font-[700] text-success"><CheckIcon size={13} /> Mark posted</button>}
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-[12.5px] font-[700] text-gray">Close</button>
          <Button onClick={async () => { setBusy(true); const ok = await onSaveScript(body); setBusy(false) }} disabled={busy || !body.trim()}>{busy ? 'Saving…' : 'Save script'}</Button>
        </div>
      </div>
    </Modal>
  )
}
