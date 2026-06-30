// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Growth OS — Content Engine. Generates outreach using the ONE AI Coach already
// in the app (via askCoach) — no second model, no parallel chat. Personalized
// angles are seeded from the rep's real pipeline + wins, evergreen angles cover
// the credit-partner playbook, and saved ideas persist to module_progress.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Skeleton } from '@/components/ui'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowIcon, EditIcon, LightningIcon, FlameIcon, TrophyIcon, PlusIcon, CheckIcon, TrashIcon, ArrowRightIcon, ShieldIcon } from '@/components/icons'
import { askCoach } from '@/lib/coachBus'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { cn } from '@/lib/utils'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

// Evergreen angles — the credit-partner outreach playbook. Each fires the real
// coach with a concrete, on-brand brief.
const ANGLES = [
  { icon: LightningIcon, title: 'Cold opener', desc: 'A first-touch that earns a reply.',
    prompt: 'Write me 3 short, non-salesy cold outreach openers (LinkedIn DM length) to a credit-repair company owner about partnering with ConsumerDirect to resell SmartCredit. Lead with their world, not our product.' },
  { icon: ShieldIcon, title: 'Reframe "we already have a credit product"', desc: 'Turn the most common objection into a conversation.',
    prompt: 'A prospect said "we already have a credit product." Write me 3 ways to reframe that into curiosity about ConsumerDirect — Sandler-style, no feature-dumping. Keep each to 2 sentences.' },
  { icon: TrophyIcon, title: 'Proof-point hook', desc: 'Use credibility to open a door.',
    prompt: 'Write 3 outreach hooks for a fintech partner that use social proof and a clear partner outcome (rev share, retention, a better client credit experience) to start a conversation about ConsumerDirect.' },
  { icon: FlameIcon, title: 'Re-engage a quiet partner', desc: 'A reason to talk that isn’t "just checking in".',
    prompt: 'Write 3 re-engagement messages to a partner who went quiet after a Proposal Sent. Give them a genuine reason to reply — a new angle, not a guilt-trip nudge. Keep them short.' },
  { icon: EditIcon, title: 'Follow-up after a great call', desc: 'Lock the next step in writing.',
    prompt: 'Write a crisp post-call follow-up email to a mortgage-broker partner that recaps their stated pain, restates the value of partnering with ConsumerDirect, and proposes a specific next step with two time options.' },
]

export default function GrowthContentPage() {
  const supabase = createClient()
  const { loading: kvLoading, value, save } = useModuleKV('growth_content', { ideas: [] })
  const [signals, setSignals] = useState<{ winDesc?: string; hotName?: string } | null>(null)
  const [draft, setDraft] = useState('')

  // Pull one real win + one hot partner to personalize the top actions.
  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) { setSignals({}); return }
      const [{ data: win }, { data: hot }] = await Promise.all([
        supabase.from('wins').select('description').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('partner_onboarding').select('partner_name').eq('user_id', user.id).eq('temperature', 'hot').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (active) setSignals({ winDesc: win?.description, hotName: hot?.partner_name })
    })
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const personalized = []
  if (signals?.hotName) personalized.push({
    icon: FlameIcon, tone: 'text-error', title: `Open ${signals.hotName}`, desc: 'You have a hot lead — strike now.',
    prompt: `I have a hot partner lead named ${signals.hotName}. Write me 2 tailored outreach messages to move them toward a signed Partnership Order Form with ConsumerDirect. Reference momentum without being pushy.`,
  })
  if (signals?.winDesc) personalized.push({
    icon: TrophyIcon, tone: 'text-gold', title: 'Repurpose your latest win', desc: 'Turn it into a proof point.',
    prompt: `Turn this win into a short, shareable outreach proof point I can use to open new partner conversations: "${signals.winDesc}". Give me a LinkedIn-post version and a 1-line DM version.`,
  })

  const addIdea = () => {
    const text = draft.trim()
    if (!text) return
    save(p => ({ ideas: [{ id: uid(), text, used: false }, ...(p.ideas || [])] }))
    setDraft('')
  }
  const toggleUsed = (id: string) => save(p => ({ ideas: (p.ideas || []).map(i => i.id === id ? { ...i, used: !i.used } : i) }))
  const removeIdea = (id: string) => save(p => ({ ideas: (p.ideas || []).filter(i => i.id !== id) }))
  const ideas = value.ideas || []

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-white"><GrowIcon size={18} /></span>
        <div>
          <h1 className="text-h2 leading-tight text-dark-text">Growth OS</h1>
          <p className="text-[12px] text-gray">Your AI-powered growth engine</p>
        </div>
      </div>
      <GrowthTabs />

      {/* Personalized — from your real pipeline + wins */}
      {personalized.length > 0 && (
        <div>
          <h2 className="mb-2 px-0.5 text-[13px] font-[800] uppercase tracking-wide text-navy">For you, right now</h2>
          <div className="space-y-2">
            {personalized.map((a, i) => {
              const Icon = a.icon
              return (
                <button key={i} onClick={() => askCoach(a.prompt)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-teal/30 bg-teal/[0.04] p-3.5 text-left transition-colors hover:bg-teal/[0.08]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-card"><Icon size={18} className={a.tone} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-[800] text-dark-text">{a.title}</div>
                    <div className="text-[12px] text-gray">{a.desc}</div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-[12px] font-[700] text-teal">Draft <ArrowRightIcon size={13} /></span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Evergreen angles */}
      <div>
        <h2 className="mb-2 px-0.5 text-[13px] font-[800] uppercase tracking-wide text-navy">Outreach angles</h2>
        <p className="mb-2 px-0.5 text-[12px] text-gray">Tap one — your AI Coach drafts it from your real context.</p>
        <div className="space-y-2">
          {ANGLES.map((a, i) => {
            const Icon = a.icon
            return (
              <button key={i} onClick={() => askCoach(a.prompt)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-card transition-colors hover:border-teal/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5"><Icon size={18} className="text-navy" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-[800] text-dark-text">{a.title}</div>
                  <div className="text-[12px] text-gray">{a.desc}</div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[12px] font-[700] text-navy">Draft <ArrowRightIcon size={13} /></span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Saved ideas board */}
      <div>
        <h2 className="mb-2 px-0.5 text-[13px] font-[800] uppercase tracking-wide text-navy">Your idea board</h2>
        <Card className="!p-3">
          <div className="flex items-end gap-2">
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addIdea() } }}
              placeholder="Jot a content idea, hook, or subject line to keep…" rows={1}
              className="max-h-28 flex-1 resize-none rounded-xl border border-border bg-bdrbg px-3 py-2 text-[13px] outline-none placeholder-gray focus:border-navy/40"
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }} />
            <Button onClick={addIdea} disabled={!draft.trim()} icon={<PlusIcon size={15} />} className="shrink-0">Save</Button>
          </div>
        </Card>

        {kvLoading ? (
          <Skeleton className="mt-2 h-16 rounded-2xl" />
        ) : ideas.length > 0 ? (
          <div className="mt-2 space-y-2">
            {ideas.map(it => (
              <div key={it.id} className={cn('flex items-start gap-2 rounded-xl border border-border bg-card p-3 shadow-card', it.used && 'opacity-60')}>
                <button onClick={() => toggleUsed(it.id)} aria-label={it.used ? 'Mark unused' : 'Mark used'} style={{ minHeight: 22 }}
                  className={cn('mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors', it.used ? 'border-teal bg-teal text-white' : 'border-gray/40 text-transparent hover:border-teal')}>
                  <CheckIcon size={13} />
                </button>
                <p className={cn('min-w-0 flex-1 whitespace-pre-wrap text-[13px] text-dark-text', it.used && 'line-through')}>{it.text}</p>
                <button onClick={() => removeIdea(it.id)} aria-label="Delete idea" className="shrink-0 text-gray hover:text-error"><TrashIcon size={15} /></button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 px-0.5 text-[12px] text-gray">No saved ideas yet — draft one above, or capture a line you want to reuse.</p>
        )}
      </div>
    </div>
  )
}
