// @ts-nocheck
'use client'

// Six-question first-run setup that teaches the AI company who you are. The
// answers seed brand_settings (voice, audience, promise, do/don't) and your
// monthly deal goal — the exact fields every agent is grounded in — so the team
// sounds like your business and reasons toward your number from the very first
// run. Shows once (persisted via module_progress); fully skippable and re-editable
// later from the Brand Voice card. Manager/owner only (they own brand + goals).

import { useState } from 'react'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { toast } from '@/components/ui'
import { ArrowRightIcon, CheckIcon, CloseIcon, CoachIcon } from '@/components/icons'

const STEPS = [
  { key: 'promise', q: 'In one line, what does your business do?', hint: 'This becomes your core promise every agent leads with.', ph: 'We teach entrepreneurs to add credit tools as a new revenue stream.', area: true },
  { key: 'audience', q: 'Who are your ideal partners?', hint: 'The businesses your team should focus on.', ph: 'Credit-repair firms, mortgage brokers, and financial coaches.', area: true },
  { key: 'voice', q: 'How should your AI team sound?', hint: 'Your brand voice — every agent writes in it.', ph: 'Warm, confident, plain-spoken. Educator first, never a hard pitch.', area: true },
  { key: 'dos', q: "One thing your team should ALWAYS do?", hint: 'A rule agents follow in every message.', ph: 'Lead with value and a clear next step.', area: false },
  { key: 'donts', q: "One thing your team should NEVER do?", hint: 'A hard line agents never cross.', ph: 'Never promise a specific credit-score result.', area: false },
  { key: 'goal', q: 'Your monthly deal goal?', hint: 'The number your whole team drives toward.', ph: '10', area: false, numeric: true },
]

export function BrandOnboarding({ supabase, teamId, userId, brandExists, onDone }: any) {
  const { loading, value, save: saveSeen } = useModuleKV('brand_onboarding_seen', { seen: false })
  const [i, setI] = useState(0)
  const [ans, setAns] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // Show only if not seen and brand isn't already set (don't nag configured teams).
  if (loading || value.seen || brandExists) return null

  const step = STEPS[i]
  const set = (v: string) => setAns(a => ({ ...a, [step.key]: v }))
  const dismiss = () => saveSeen({ seen: true })

  const finish = async () => {
    if (!teamId) { dismiss(); onDone?.(); return }
    setBusy(true)
    try {
      const brandRow = {
        team_id: teamId,
        promise: ans.promise?.trim() || null, audience: ans.audience?.trim() || null,
        voice: ans.voice?.trim() || null, dos: ans.dos?.trim() || null, donts: ans.donts?.trim() || null,
        updated_by: userId, updated_at: new Date().toISOString(),
      }
      const jobs: any[] = [supabase.from('brand_settings').upsert(brandRow, { onConflict: 'team_id' })]
      const g = parseInt(ans.goal, 10)
      if (Number.isFinite(g) && g > 0) jobs.push(supabase.from('goals').upsert({ user_id: userId, monthly_deal_goal: g }, { onConflict: 'user_id' }))
      const results = await Promise.all(jobs)
      const err = results.find((r: any) => r?.error)?.error
      if (err) { toast.error(`Couldn't save. ${err.message}`); setBusy(false); return }
      toast.success('Your team is set up — every agent now speaks in your voice')
      saveSeen({ seen: true }); onDone?.()
    } finally { setBusy(false) }
  }

  const next = () => { if (i < STEPS.length - 1) setI(i + 1); else finish() }
  const answered = (ans[step.key] ?? '').trim().length > 0

  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-dark-text/55 p-4 backdrop-blur-[2px] animate-fade-in">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-modal animate-pop">
        <div className="relative overflow-hidden bg-gradient-hero p-5 text-white">
          <button onClick={dismiss} aria-label="Skip" className="absolute right-3 top-3 text-white/70 hover:text-white"><CloseIcon size={18} /></button>
          <div className="flex items-center gap-2 text-[11px] font-[800] uppercase tracking-[0.14em] text-white/75"><CoachIcon size={14} /> Set up your AI team</div>
          <h1 className="mt-1 text-[19px] font-[900] leading-tight">{step.q}</h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/85">{step.hint}</p>
        </div>

        <div className="p-5">
          {step.area ? (
            <textarea autoFocus value={ans[step.key] ?? ''} onChange={e => set(e.target.value)} rows={3} placeholder={step.ph}
              className="w-full rounded-xl border border-border bg-card p-3 text-[13px] leading-relaxed outline-none focus:border-navy/40" />
          ) : (
            <input autoFocus value={ans[step.key] ?? ''} onChange={e => set(e.target.value)} placeholder={step.ph}
              inputMode={step.numeric ? 'numeric' : 'text'}
              onKeyDown={e => { if (e.key === 'Enter' && answered) next() }}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] outline-none focus:border-navy/40" />
          )}

          {/* progress dots */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {STEPS.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-navy' : k < i ? 'w-1.5 bg-teal' : 'w-1.5 bg-border'}`} />)}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border p-4">
          <button onClick={dismiss} className="rounded-lg px-3 py-2.5 text-[12.5px] font-[700] text-gray hover:text-dark-text">Skip</button>
          {i > 0 && <button onClick={() => setI(i - 1)} className="rounded-lg px-3 py-2.5 text-[12.5px] font-[700] text-gray hover:text-dark-text">Back</button>}
          <div className="flex-1" />
          <button onClick={next} disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-[13.5px] font-[800] text-white shadow-card transition-transform active:scale-95 disabled:opacity-60">
            {i === STEPS.length - 1 ? (busy ? 'Saving…' : <>Finish <CheckIcon size={15} /></>) : <>{answered ? 'Next' : 'Skip this'} <ArrowRightIcon size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
