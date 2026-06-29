// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Badge, toast } from '@/components/ui'
import { TargetIcon, ArrowRightIcon, BackIcon, LightningIcon, SuccessIcon, RefreshIcon, CoachIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

// Scenarios are drawn from the real objections taught in Module 3 and real
// ConsumerDirect partner personas. Each gives the AI a character to play.
const SCENARIOS = [
  {
    id: 'have-product',
    title: 'They already have a credit product',
    persona: 'a VP of Operations at a mid-size mortgage brokerage that already bundles a basic credit-monitoring add-on for borrowers',
    situation: 'The BDR has reached you on a follow-up call. You think your current solution is "good enough."',
    objection: 'Lead with: "We already offer something like this." Make the rep prove engagement and improvement beat plain monitoring.',
    difficulty: 'medium', tag: 'Objection',
  },
  {
    id: 'price',
    title: 'Just tell me the price',
    persona: 'the owner of a fast-growing credit-repair company who is extremely price-focused and time-poor',
    situation: 'You picked up a cold call and immediately want the number before hearing anything else.',
    objection: 'Open with: "What’s the price?" Resist a generic pitch. Reward the rep only if they tie value to your business before quoting.',
    difficulty: 'hard', tag: 'Objection',
  },
  {
    id: 'timing',
    title: 'Now isn’t a good time',
    persona: 'a busy independent financial coach juggling clients',
    situation: 'The BDR caught you between meetings. You are brushing them off out of habit, not real disinterest.',
    objection: 'Lead with: "Now isn’t a good time." Give the rep a narrow opening if they’re concise and respect your time.',
    difficulty: 'easy', tag: 'Brush-off',
  },
  {
    id: 'think',
    title: 'I need to think about it',
    persona: 'a partnerships manager at a fintech who avoids committing to anything',
    situation: 'You’ve had a decent first conversation but you stall at the end.',
    objection: 'Lead with: "I need to think about it." Stay vague until the rep surfaces what you’d actually need to decide.',
    difficulty: 'medium', tag: 'Stall',
  },
  {
    id: 'cold',
    title: 'Cold open — earn the conversation',
    persona: 'a skeptical credit-repair business owner who gets a lot of vendor calls',
    situation: 'You just answered an unexpected call from a number you don’t recognize.',
    objection: 'Default to guarded: "Who is this and why should I care?" Warm up only if the rep is human and relevant fast.',
    difficulty: 'hard', tag: 'Cold call',
  },
]

const DIFF_COLOR = { easy: 'success', medium: 'gold', hard: 'error' }

export default function DrillPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string>()
  const [scenario, setScenario] = useState<typeof SCENARIOS[number] | null>(null)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)
  const [feedback, setFeedback] = useState<string>('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setUserId(user.id) })
  }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, feedback])

  // Reward a won drill through the server-side XP engine (capped at 5/day).
  const awardDrillXp = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'drill_complete' }),
      })
      if (res.ok) {
        const d = await res.json()
        if (d.awarded) toast.xp(d.xp_earned ?? 0, 'Drill won!')
        else toast.success('Drill won — they agreed to a next step!')
      }
    } catch { /* non-blocking */ }
  }

  const pick = (s) => { setScenario(s); setMessages([]); setComplete(false); setFeedback('') }
  const reset = () => { setScenario(null); setMessages([]); setComplete(false); setFeedback(''); setInput('') }

  const send = async () => {
    const text = input.trim()
    if (!text || loading || complete) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'drill', userId, scenario, message: text, history: messages.slice(-10) }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const full = [...next, { role: 'assistant', content: data.response }]
      setMessages(full)
      // On a won drill, surface coach feedback automatically — no extra tap.
      if (data.complete) { setComplete(true); awardDrillXp(); getFeedback(full) }
    } catch {
      setMessages([...next, { role: 'assistant', content: '(The prospect went quiet — connection issue. Try again.)' }])
    } finally { setLoading(false) }
  }

  const getFeedback = async (hist = messages) => {
    if (feedbackLoading || hist.filter(m => m.role === 'user').length === 0) return
    setFeedbackLoading(true)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'feedback', userId, history: hist }),
      })
      const data = await res.json()
      setFeedback(data.response ?? 'Could not generate feedback.')
    } catch {
      setFeedback('Could not generate feedback right now. Try again in a moment.')
    } finally { setFeedbackLoading(false) }
  }

  // Bridge into Coach with the drill + feedback pre-loaded, so the rep can dig
  // deeper without leaving and re-typing the context.
  const discussWithCoach = () => {
    const seed = `I just practiced the "${scenario?.title}" objection drill. Here's the coach feedback I got:\n\n${feedback}\n\nHelp me sharpen this — what should I focus on next?`
    try { sessionStorage.setItem('coachSeed', seed) } catch { /* ignore */ }
    router.push('/coach')
  }

  // ── Scenario picker ─────────────────────────────────────────────────────────
  if (!scenario) return (
    <div className="space-y-5 pb-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/10 shrink-0">
          <TargetIcon size={22} className="text-teal" />
        </div>
        <div>
          <h1 className="text-h1 text-dark-text">Objection Drill</h1>
          <p className="mt-0.5 text-[13px] text-gray">Rehearse live against an AI prospect, then get Sandler-based feedback. Reps who practice objections close more.</p>
        </div>
      </div>

      <div className="space-y-3">
        {SCENARIOS.map(s => (
          <button key={s.id} onClick={() => pick(s)}
            className="w-full text-left rounded-md border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-teal hover:shadow-modal">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-[700] text-dark-text">{s.title}</span>
              <Badge variant={DIFF_COLOR[s.difficulty]}>{s.difficulty}</Badge>
            </div>
            <p className="mt-1 text-[12px] text-gray">{s.situation}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="navy">{s.tag}</Badge>
              <span className="ml-auto flex items-center gap-1 text-[12px] font-[700] text-teal">Start drill <ArrowRightIcon size={14} /></span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // ── Roleplay ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] desktop:h-[calc(100vh-4rem)]">
      <div className="mb-3 flex items-center gap-3 shrink-0">
        <button onClick={reset} className="flex items-center gap-1 text-[13px] text-gray hover:text-dark-text">
          <BackIcon size={16} /> Scenarios
        </button>
        <span className="ml-auto"><Badge variant={DIFF_COLOR[scenario.difficulty]}>{scenario.difficulty}</Badge></span>
      </div>

      <Card className="mb-3 shrink-0 !p-3">
        <div className="text-[11px] font-[800] uppercase tracking-wide text-gray">Your scenario</div>
        <div className="mt-0.5 text-[14px] font-[700] text-dark-text">{scenario.title}</div>
        <p className="mt-1 text-[12px] text-gray">You're talking to {scenario.persona}. {scenario.situation}</p>
      </Card>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3 scrollbar-hide">
        {messages.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-bdrbg p-4 text-center">
            <p className="text-[13px] text-mid-text">You've got them on the line. <span className="font-[700] text-dark-text">Open the conversation</span> — set an up-front contract and start uncovering their world.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            {m.role === 'assistant' && (
              <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-navy/10 shrink-0">
                <span className="text-[11px] font-[800] text-navy">P</span>
              </div>
            )}
            <div className={cn('max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              m.role === 'user' ? 'bg-teal text-white rounded-tr-sm' : 'bg-card border border-border text-dark-text rounded-tl-sm shadow-card')}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy/10"><span className="text-[11px] font-[800] text-navy">P</span></div>
            <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-card">
              <div className="flex h-4 items-center gap-1">{[0,1,2].map(i => <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-gray" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
            </div>
          </div>
        )}

        {complete && (
          <Card variant="completed" className="!p-4">
            <div className="flex items-center gap-2"><SuccessIcon size={18} className="text-success" /><span className="text-[14px] font-[800] text-dark-text">Drill won — they agreed to a next step.</span></div>
            <p className="mt-1 text-[12px] text-gray">That's exactly the outcome a clean up-front contract drives. Review the feedback to lock in what worked.</p>
          </Card>
        )}

        {feedback && (
          <Card className="!p-4 border-teal/40">
            <div className="mb-2 flex items-center gap-2"><LightningIcon size={16} className="text-teal" /><span className="text-h3 text-dark-text">Coach feedback</span></div>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-mid-text">{feedback}</p>
            <Button variant="ghost" size="sm" onClick={discussWithCoach} className="mt-3" icon={<CoachIcon size={15} />}>
              Discuss with Coach
            </Button>
          </Card>
        )}
        <div ref={endRef} />
      </div>

      {/* Actions */}
      <div className="shrink-0 space-y-2">
        {messages.filter(m => m.role === 'user').length > 0 && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={getFeedback} loading={feedbackLoading} fullWidth icon={<LightningIcon size={15} />}>
              {feedback ? 'Refresh feedback' : 'Get coach feedback'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => pick(scenario)} icon={<RefreshIcon size={15} />}>Retry</Button>
          </div>
        )}
        {!complete && (
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-card">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Type what you'd say to the prospect…"
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder-gray"
            />
            <button onClick={send} disabled={!input.trim() || loading} aria-label="Send"
              className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                input.trim() && !loading ? 'bg-teal text-white hover:bg-teal-dark' : 'bg-bdrbg text-gray')}>
              <ArrowRightIcon size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
