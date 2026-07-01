// @ts-nocheck
'use client'

// Apex — the continuous feedback loop, capture end. A small, warm control
// reachable from the chrome on every Growth surface: rate the system up/down,
// optionally say what you'd have wanted instead, and it's stored in
// growth_feedback (RLS: you own your rows; managers read the team's for the
// digest). On submit it thanks you and teases the upcoming release, to close the
// loop emotionally even before the nightly synthesis runs.
//
// TODO(integration): the nightly Manager Digest → approve/reject → versioned
// instruction-update pipeline is specified in /docs/build-log.md; this ships the
// capture + changelog surfaces it depends on.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/components/usePermissions'
import { FeedbackDigest } from '@/components/growth/FeedbackDigest'
import { StarIcon, CloseIcon, CheckIcon, RefreshIcon, DashboardIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

// Recent applied improvements — the visible proof the loop closes. Seeded with
// what this build actually shipped; new approved feedback appends here.
const CHANGELOG = [
  { v: '2.4', when: 'This release', what: 'Agentic OS fully built out — Content Engine, Lead Gen, Automations, the 18-agent AI Team, and the Triage Strip, all native to BDR Hub.' },
  { v: '2.3', when: 'Earlier', what: 'AI Coach now reasons from your real Agentic OS state — goals, pipeline temperature, and which agents are live.' },
  { v: '2.2', when: 'Earlier', what: 'Growth goals unified onto the same row as the Commission Planner, so one number drives the whole app.' },
]

export function FeedbackButton() {
  const supabase = createClient()
  const { isManager } = usePermissions()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'give' | 'digest'>('give')
  const [sent, setSent] = useState(false)
  const [sentiment, setSentiment] = useState<string | null>(null)
  const [detail, setDetail] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!sentiment || saving) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: u } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()
      await supabase.from('growth_feedback').insert({ user_id: user.id, team_id: u?.team_id ?? null, surface: 'growth-os', sentiment, detail: detail.trim() || null })
    }
    setSaving(false); setSent(true)
  }

  const reset = () => { setOpen(false); setTimeout(() => { setSent(false); setSentiment(null); setDetail(''); setMode('give') }, 200) }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-[700] text-gray hover:text-navy">
        <StarIcon size={12} /> Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-dark-text/50 p-4" onClick={reset}>
          <div className={cn('w-full rounded-2xl bg-card p-5 shadow-modal', mode === 'digest' ? 'max-h-[85vh] max-w-md overflow-y-auto' : 'max-w-sm')} onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-[900] text-dark-text">{mode === 'digest' ? 'Team feedback digest' : 'Help shape Agentic OS'}</h2>
              <button onClick={reset} aria-label="Close" className="text-gray hover:text-dark-text"><CloseIcon size={18} /></button>
            </div>

            {/* Manager-only tab switch: give feedback vs review the team digest */}
            {isManager && (
              <div className="mb-3 flex gap-0.5 rounded-lg border border-border bg-bdrbg p-1">
                {[['give', 'Give feedback', StarIcon], ['digest', 'Team digest', DashboardIcon]].map(([k, l, Icon]) => (
                  <button key={k} onClick={() => setMode(k)} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] font-[700]', mode === k ? 'bg-card text-navy shadow-sm' : 'text-gray')}>
                    <Icon size={12} /> {l}
                  </button>
                ))}
              </div>
            )}

            {mode === 'digest' ? (
              <FeedbackDigest />
            ) : sent ? (
              <div className="py-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success animate-pop"><CheckIcon size={24} /></div>
                <p className="text-[14px] font-[800] text-dark-text">Thank you — got it.</p>
                <p className="mx-auto mt-1 max-w-[260px] text-[12.5px] leading-relaxed text-gray">You&rsquo;ll see this reflected in an upcoming release. Your feedback goes straight into how the system improves.</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-[12.5px] leading-relaxed text-gray">Is Agentic OS steering you well? Your rating rolls into the daily improvement digest.</p>
                <div className="mb-3 flex gap-2">
                  {[['up', 'Working well', 'bg-success/10 text-success border-success/30'], ['down', 'Needs work', 'bg-error/8 text-error border-error/30']].map(([k, l, on]) => (
                    <button key={k} onClick={() => setSentiment(k)} className={cn('flex-1 rounded-xl border py-2.5 text-[13px] font-[700] transition-colors', sentiment === k ? on : 'border-border text-gray hover:border-navy/30')}>{l}</button>
                  ))}
                </div>
                <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3} placeholder="What would you have wanted instead? (optional)"
                  className="mb-3 w-full resize-none rounded-xl border border-border bg-bdrbg px-3 py-2 text-[13px] outline-none placeholder-gray focus:border-navy/40" />
                <button onClick={submit} disabled={!sentiment || saving} className={cn('w-full rounded-lg py-2.5 text-[13px] font-[800] text-white', sentiment && !saving ? 'bg-navy' : 'bg-gray/40')}>{saving ? 'Sending…' : 'Send feedback'}</button>

                <div className="mt-4 border-t border-border pt-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-[800] uppercase tracking-wide text-gray"><RefreshIcon size={11} /> Recent improvements</div>
                  <div className="space-y-2">
                    {CHANGELOG.map(c => (
                      <div key={c.v} className="flex gap-2">
                        <span className="mt-0.5 shrink-0 rounded bg-teal/10 px-1.5 py-0.5 text-[10px] font-[800] text-teal">v{c.v}</span>
                        <p className="text-[11.5px] leading-relaxed text-mid-text">{c.what}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
