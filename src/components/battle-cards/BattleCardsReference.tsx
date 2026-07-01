// @ts-nocheck
'use client'

// Battle Cards reference tool — market map, commission comparison, per-competitor
// cards (grouped, checkable for mastery), an in-tool content search, and a cheat
// sheet. Native React + the BDR Hub UI kit. Mastery state persists via useBattleCards.

import { useMemo, useState } from 'react'
import { Card, toast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { SearchIcon, CloseIcon, BackIcon, CheckIcon, ArrowRightIcon, BookIcon, TargetIcon, RefreshIcon } from '@/components/icons'
import { COMPETITORS, MARKET_MAP, COMMISSION_COMPARISON, GROUP_MAP } from '@/lib/modules/battle-cards'

const THREAT_PILL = { high: 'bg-error/10 text-error', med: 'bg-gold/15 text-[#A06C00]', low: 'bg-teal/10 text-teal', map: 'bg-navy/10 text-navy-ink' }
const strip = (s: string) => (s || '').replace(/<[^>]+>/g, '')
const COMP_ENTRIES = Object.entries(COMPETITORS) // [key, competitor][]

// One block card. `onToggle` present → show the "Got it" mastery checkbox.
function Block({ b, checked, onToggle }: any) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-stretch">
        <div className="w-1 shrink-0" style={{ backgroundColor: b.pill }} />
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-[800] uppercase tracking-wide text-gray">{b.type}{b.sub ? ` · ${b.sub}` : ''}</span>
            {b.tag && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-[800]" style={{ backgroundColor: b.tagBg, color: b.tagColor }}>{b.tag}</span>}
            {onToggle && (
              <button onClick={onToggle} style={{ minHeight: 18 }} aria-label={checked ? 'Mastered' : 'Mark got it'}
                className={cn('ml-auto flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors', checked ? 'border-success bg-success text-white' : 'border-border text-transparent hover:border-teal')}>
                <CheckIcon size={11} />
              </button>
            )}
          </div>
          <h3 className="mt-1 text-[14px] font-[800] leading-tight text-dark-text">{b.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-mid-text">{b.summary}{b.link && <> <a href={b.link} target="_blank" rel="noreferrer" className="font-[700] text-teal">{b.linkLabel || 'Visit'} ↗</a></>}</p>
          {b.body && (
            <>
              <button onClick={() => setOpen(o => !o)} className="mt-1.5 text-[12px] font-[700] text-navy-ink">{open ? 'Show less' : 'Read more'}</button>
              {open && <div className="bc-body mt-1.5 text-[13px] leading-relaxed text-dark-text animate-rise" dangerouslySetInnerHTML={{ __html: b.body }} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Group a competitor/special's blocks by GROUP_MAP into labelled sections.
function grouped(blocks: any[]) {
  const sections: { label: string; items: any[] }[] = []
  blocks.forEach((b, i) => {
    const label = GROUP_MAP[b.type] || b.type
    let sec = sections.find(s => s.label === label)
    if (!sec) { sec = { label, items: [] }; sections.push(sec) }
    sec.items.push({ b, i })
  })
  return sections
}

export function BattleCardsReference({ progress, save, onReplay }: any) {
  const [view, setView] = useState<string>('home')   // 'home' | 'cheat' | 'market' | 'commission' | competitorKey
  const [q, setQ] = useState('')

  const checks = progress.checks || {}
  const masteredCount = COMP_ENTRIES.filter(([k, c]) => (checks[k]?.length ?? 0) >= c.blocks.length).length

  const toggleCard = (key: string, idx: number, total: number) => {
    save(p => {
      const cur = new Set(p.checks?.[key] ?? [])
      cur.has(idx) ? cur.delete(idx) : cur.add(idx)
      const arr = [...cur].sort((a, b) => a - b)
      const nextChecks = { ...(p.checks || {}), [key]: arr }
      const celebrated = [...(p.celebrated || [])]
      // Mastery celebration (once per competitor, then once for all-9).
      if (arr.length >= total && !celebrated.includes(key)) {
        celebrated.push(key)
        const all9 = COMP_ENTRIES.every(([k, c]) => (k === key ? arr.length : nextChecks[k]?.length ?? 0) >= c.blocks.length)
        if (all9 && !celebrated.includes('all')) { celebrated.push('all'); setTimeout(() => toast.success('All 9 competitors mastered — you’re battle-ready.'), 250) }
        else setTimeout(() => toast.success(`${COMPETITORS[key].name} mastered`), 100)
      }
      return { checks: nextChecks, celebrated }
    })
  }

  // ── In-tool content search (not a second global ⌘K — scoped to battle cards) ──
  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    const out: any[] = []
    const scan = (key: string, name: string, blocks: any[]) => blocks.forEach(b => {
      if ((b.title + ' ' + b.summary + ' ' + strip(b.body)).toLowerCase().includes(term)) out.push({ key, name, b })
    })
    COMP_ENTRIES.forEach(([k, c]) => scan(k, c.name, c.blocks))
    scan('market', MARKET_MAP.name, MARKET_MAP.blocks)
    scan('commission', COMMISSION_COMPARISON.name, COMMISSION_COMPARISON.blocks)
    return out.slice(0, 20)
  }, [q])

  const HL = <style>{`.bc-body .hl{background:rgba(0,194,178,.14);color:#0d3b35;font-weight:600;padding:0 2px;border-radius:3px}`}</style>

  // ── Detail view (competitor or special) ──
  if (view !== 'home' && view !== 'cheat') {
    const isComp = !!COMPETITORS[view]
    const data = isComp ? COMPETITORS[view] : view === 'market' ? MARKET_MAP : COMMISSION_COMPARISON
    const total = data.blocks.length
    const done = isComp ? (checks[view]?.length ?? 0) : 0
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        {HL}
        <button onClick={() => setView('home')} className="flex items-center gap-1 text-[13px] font-[700] text-navy-ink"><BackIcon size={15} /> All battle cards</button>
        <Card className="overflow-hidden !p-0">
          <div className="bg-gradient-hero p-4 text-white">
            <div className="flex items-center gap-2">
              <span className={cn('rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-[800] uppercase')}>{data.pill}</span>
              {isComp && <span className="ml-auto text-[11px] font-[700] text-white/80 tabular-nums">{done}/{total} got it</span>}
            </div>
            <h1 className="mt-2 text-[20px] font-[900]">{data.name}</h1>
            <p className="mt-1 text-[13px] leading-relaxed text-white/85">{data.sub}</p>
            {isComp && data.link && <a href={data.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] font-[700] text-white/90 underline">{data.linkLabel || 'Visit site'} ↗</a>}
          </div>
        </Card>
        {grouped(data.blocks).map(sec => (
          <div key={sec.label}>
            <div className="mb-1.5 mt-1 text-[11px] font-[800] uppercase tracking-wide text-gray">{sec.label}</div>
            <div className="space-y-2">
              {sec.items.map(({ b, i }) => (
                <Block key={i} b={b} checked={isComp && checks[view]?.includes(i)} onToggle={isComp ? () => toggleCard(view, i, total) : undefined} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Cheat sheet ──
  if (view === 'cheat') {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        {HL}
        <button onClick={() => setView('home')} className="flex items-center gap-1 text-[13px] font-[700] text-navy-ink"><BackIcon size={15} /> Back</button>
        <h1 className="text-h2 text-dark-text">Cheat sheet</h1>
        <p className="text-[13px] text-gray">Your one-page cram — the headline edge and the line to say for each competitor.</p>
        <div className="space-y-2">
          {COMP_ENTRIES.map(([k, c]) => {
            const edge = c.blocks.find(b => /edge|win/i.test(b.tag)) || c.blocks.find(b => b.type === 'YOUR WIN')
            const say = c.blocks.find(b => b.type === 'TALK TRACK')
            return (
              <button key={k} onClick={() => setView(k)} className="block w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm hover:border-teal/40">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-[800] text-dark-text">{c.name}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-[800]', THREAT_PILL[c.threat])}>{c.pill}</span>
                  {(checks[k]?.length ?? 0) >= c.blocks.length && <span className="ml-auto rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-[800] text-success">Mastered</span>}
                </div>
                {edge && <p className="mt-1 text-[12.5px] leading-snug text-mid-text"><span className="font-[700] text-teal">Edge:</span> {edge.summary}</p>}
                {say && <p className="mt-0.5 text-[12.5px] leading-snug text-mid-text"><span className="font-[700] text-navy-ink">Say:</span> {strip(say.summary)}</p>}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Home ──
  const pct = Math.round((masteredCount / COMP_ENTRIES.length) * 100)
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Mastery header */}
      <Card className="flex items-center gap-4 overflow-hidden">
        <div className="relative h-14 w-14 shrink-0">
          <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
            <circle cx="28" cy="28" r="24" fill="none" stroke="#E4ECF2" strokeWidth="5" />
            <circle cx="28" cy="28" r="24" fill="none" stroke="rgb(var(--teal))" strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-[800] text-navy-ink">{masteredCount}/9</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-[800] text-dark-text">Competitive mastery</div>
          <div className="text-[12px] text-gray">{masteredCount === 9 ? 'All competitors mastered — you’re battle-ready.' : `${9 - masteredCount} to go. Check off every card to master a competitor.`}</div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search every card — pricing, talk tracks, objections…"
          className="w-full rounded-pill border border-border bg-card py-2.5 pl-9 pr-9 text-sm shadow-card outline-none focus:ring-2 focus:ring-teal" />
        {q && <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray hover:text-dark-text"><CloseIcon size={16} /></button>}
      </div>

      {q.trim() ? (
        <div className="space-y-2">
          {results.length === 0 ? <p className="py-6 text-center text-[13px] text-gray">No cards match “{q}”.</p> : results.map((r, i) => (
            <button key={i} onClick={() => { setView(r.key); setQ('') }} className="block w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm hover:border-teal/40">
              <div className="text-[10px] font-[800] uppercase tracking-wide text-gray">{r.name}</div>
              <div className="text-[13px] font-[700] text-dark-text">{r.b.title}</div>
              <div className="mt-0.5 line-clamp-2 text-[12px] text-mid-text">{r.b.summary}</div>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Frameworks */}
          <div className="grid grid-cols-2 gap-2">
            {[{ k: 'market', t: 'Market Overview', s: '9 competitors · 5 segments', I: TargetIcon }, { k: 'commission', t: 'Commission Compare', s: 'How each program pays', I: ArrowRightIcon }].map(f => (
              <button key={f.k} onClick={() => setView(f.k)} className="rounded-2xl bg-gradient-hero p-3.5 text-left text-white shadow-card transition-transform active:scale-[0.99]">
                <f.I size={18} className="text-white/90" />
                <div className="mt-2 text-[14px] font-[800]">{f.t}</div>
                <div className="text-[11px] text-white/70">{f.s}</div>
              </button>
            ))}
          </div>

          {/* Competitor picker */}
          <div className="text-[11px] font-[800] uppercase tracking-wide text-gray">Competitors</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {COMP_ENTRIES.map(([k, c]) => {
              const done = checks[k]?.length ?? 0, total = c.blocks.length, mastered = done >= total
              return (
                <button key={k} onClick={() => setView(k)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm hover:border-teal/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-[800] text-dark-text">{c.name}</span>
                      {mastered && <span className="shrink-0 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-[800] text-success">Mastered</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-[800]', THREAT_PILL[c.threat])}>{c.pill}</span>
                      <span className="text-[11px] text-gray tabular-nums">{done}/{total}</span>
                    </div>
                  </div>
                  <ArrowRightIcon size={15} className="shrink-0 text-gray" />
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setView('cheat')} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-[13px] font-[700] text-navy-ink hover:border-navy/40">
              <BookIcon size={14} /> Cheat sheet
            </button>
            <button onClick={onReplay} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bdrbg py-2.5 text-[13px] font-[700] text-mid-text hover:bg-border/40">
              <RefreshIcon size={14} /> Replay training
            </button>
          </div>
        </>
      )}
    </div>
  )
}
