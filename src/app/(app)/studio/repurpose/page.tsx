// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Repurposing lab — paste a podcast/long-form transcript, and your Podcast
// Repurposing Lead turns it into a week of ready-to-post assets (reels, quotes,
// carousels, text, DMs, email + lead-magnet angles, hooks). Past sources + their
// assets persist on podcast_assets / repurposed_assets.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createUntypedClient } from '@/lib/supabase/untyped'
import { Card, Skeleton, toast, Button } from '@/components/ui'
import { BackIcon, LightningIcon, CopyIcon, CheckIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const KIND_TONE: Record<string, string> = {
  reel: 'bg-teal/10 text-teal', clip: 'bg-teal/10 text-teal', quote: 'bg-gold/12 text-[#A06C00]',
  carousel: 'bg-navy/8 text-navy-ink', text: 'bg-bdrbg text-gray', story: 'bg-navy/8 text-navy-ink',
  dm: 'bg-teal/10 text-teal', email: 'bg-navy/8 text-navy-ink', hook: 'bg-gold/12 text-[#A06C00]', lead_magnet: 'bg-success/10 text-success',
}

export default function RepurposePage() {
  const supabase = createUntypedClient()
  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [busy, setBusy] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [loadingSources, setLoadingSources] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const loadSources = async () => {
    const { data } = await supabase.from('podcast_assets').select('id, title, created_at').order('created_at', { ascending: false }).limit(10)
    setSources(data ?? []); setLoadingSources(false)
  }
  useEffect(() => { loadSources() }, [])

  const openSource = async (id: string) => {
    const { data } = await supabase.from('repurposed_assets').select('*').eq('podcast_asset_id', id).order('created_at', { ascending: true })
    setAssets(data ?? [])
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const generate = async () => {
    if (!transcript.trim() || busy) return
    setBusy(true); setAssets([])
    try {
      const res = await fetch('/api/content/repurpose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, transcript }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      setAssets(data.assets || [])
      toast.success(`${(data.assets || []).length} assets ready`)
      loadSources()
    } catch (e: any) {
      toast.error(`Couldn't repurpose. ${e.message || ''}`)
    } finally { setBusy(false) }
  }

  const copy = async (a: any) => { try { await navigator.clipboard.writeText(a.body); setCopied(a.id); setTimeout(() => setCopied(null), 1500) } catch {} }

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex items-center gap-2">
        <Link href="/studio" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-gray"><BackIcon size={16} /></Link>
        <div>
          <h1 className="text-h1 text-dark-text">Repurpose</h1>
          <p className="text-[13px] text-gray">One long-form → a week of posts.</p>
        </div>
      </div>

      <Card className="!p-4">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (e.g. My podcast on AI for agencies)" className="mb-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" />
        <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={7} placeholder="Paste your transcript or long-form text here…" className="w-full rounded-lg border border-border bg-card p-3 text-[13px] leading-relaxed outline-none focus:border-navy/40" />
        <Button onClick={generate} disabled={busy || !transcript.trim()} className="mt-3 w-full">{busy ? 'Repurposing…' : 'Repurpose with AI'}</Button>
      </Card>

      {assets.length > 0 && (
        <div className="space-y-2">
          <div className="px-0.5 text-[11px] font-[800] uppercase tracking-wide text-gray">{assets.length} assets</div>
          {assets.map(a => (
            <Card key={a.id} className="!p-3.5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-[800] uppercase', KIND_TONE[a.kind] || 'bg-bdrbg text-gray')}>{String(a.kind).replace('_', ' ')}</span>
                {a.title && <span className="truncate text-[12.5px] font-[800] text-dark-text">{a.title}</span>}
                <button onClick={() => copy(a)} className={cn('ml-auto flex items-center gap-1 text-[11px] font-[700]', copied === a.id ? 'text-success' : 'text-teal')}>{copied === a.id ? <><CheckIcon size={12} /> Copied</> : <><CopyIcon size={12} /> Copy</>}</button>
              </div>
              <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-mid-text">{a.body}</p>
            </Card>
          ))}
        </div>
      )}

      <div>
        <div className="mb-2 px-0.5 text-[11px] font-[800] uppercase tracking-wide text-gray">Past sources</div>
        {loadingSources ? <Skeleton className="h-14 rounded-2xl" /> : sources.length === 0 ? (
          <p className="px-1 text-[12px] text-gray">Nothing repurposed yet.</p>
        ) : (
          <div className="space-y-2">
            {sources.map(s => (
              <Card key={s.id} hover className="flex items-center gap-3 !p-3.5 cursor-pointer" onClick={() => openSource(s.id)}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/8 text-navy-ink"><LightningIcon size={17} /></span>
                <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-[800] text-dark-text">{s.title}</div><div className="text-[11px] text-gray">Tap to view its assets</div></div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
