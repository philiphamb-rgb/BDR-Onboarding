// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CoachIcon, CloseIcon, ArrowRightIcon, LightningIcon } from '@/components/icons'

interface Msg { id: string; role: 'user' | 'assistant'; content: string }
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

// Map the current route to a friendly screen name + situational starter prompts,
// so the pocket coach already knows what the rep is looking at.
function contextFor(pathname: string): { label: string; prompts: string[] } {
  const p = pathname || ''
  if (p === '/home') return { label: 'Home dashboard', prompts: ['How am I pacing to my goal?', 'What should I focus on right now?'] }
  if (p.startsWith('/partners')) return { label: 'Partners pipeline', prompts: ['Who should I follow up with first?', 'Help me move a stuck deal forward'] }
  if (p.startsWith('/analytics')) return { label: 'My analytics', prompts: ['What do my numbers say I should improve?', "Where's my biggest bottleneck?"] }
  if (p.startsWith('/schedule')) return { label: 'Time Blocking', prompts: ['How do I get the most from my power blocks?', 'Plan my next selling block'] }
  if (p.startsWith('/tasks')) return { label: 'Tasks', prompts: ['Help me prioritize my tasks', 'What should I do first today?'] }
  if (p.startsWith('/train')) return { label: 'Learning Center', prompts: ['Sum up the key idea I should apply', 'How do I use this on a real call?'] }
  if (p.startsWith('/wins')) return { label: 'Wins log', prompts: ['What pattern do you see in my wins?', 'How do I repeat my best week?'] }
  if (p.startsWith('/calculator')) return { label: 'Income Calculator', prompts: ['How many deals to hit my income goal?', 'Is my goal realistic?'] }
  if (p.startsWith('/leaderboard')) return { label: 'Leaderboard', prompts: ['How do I climb the leaderboard?', 'What are top reps doing differently?'] }
  if (p.startsWith('/manager')) return { label: 'Manager view', prompts: ['Where should I coach my team this week?', "Who's at risk and why?"] }
  return { label: 'BDR Hub', prompts: ['What should I focus on this week?', 'How can I improve my close rate?'] }
}

export function CoachDock() {
  const pathname = usePathname()
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [firstName, setFirstName] = useState('')
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // The full Coach screen and the live Drill own the conversation there — no
  // floating duplicate on those routes.
  const hidden = pathname?.startsWith('/coach') || pathname?.startsWith('/drill')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('users').select('first_name, name').eq('id', user.id).single()
        .then(({ data }) => setFirstName(data?.first_name || (data?.name ?? '').split(' ')[0] || ''))
    })
  }, [])

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

  // Lock background scroll while the dock is open (mobile).
  useEffect(() => {
    if (open) { document.body.style.overflow = 'hidden' } else { document.body.style.overflow = '' }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const ctx = contextFor(pathname)

  const send = async (text?: string) => {
    const messageText = (text ?? input).trim()
    if (!messageText || loading || !userId) return
    setMessages(prev => [...prev, { id: uid(), role: 'user', content: messageText }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          userId,
          pageContext: ctx.label,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok || !res.body) throw new Error('bad response')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      let aiId: string | null = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        if (!aiId) {
          aiId = uid()
          const id = aiId
          setMessages(prev => [...prev, { id, role: 'assistant', content: acc }])
        } else {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: acc } : m))
        }
      }
      if (!aiId) setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: "I couldn't generate a response — try again." }])
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: "I'm having trouble connecting right now. Try again in a moment." }])
    } finally {
      setLoading(false)
    }
  }

  if (hidden) return null

  return (
    <>
      {/* Floating launcher — the coach, always one tap away */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask your AI Coach"
          className="group fixed right-4 z-[390] flex items-center gap-2 rounded-full bg-gradient-hero px-4 py-3 text-white shadow-modal transition-transform active:scale-95 desktop:right-6
                     bottom-[calc(84px+env(safe-area-inset-bottom))] desktop:bottom-6"
        >
          <span className="absolute inset-0 rounded-full bg-teal/40 animate-coach-pulse" aria-hidden="true" />
          <CoachIcon size={20} className="relative text-white" />
          <span className="relative hidden text-[13px] font-[800] sm:inline">Ask Coach</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[400] flex items-end justify-end sm:p-4">
          <div className="absolute inset-0 bg-dark-text/40 backdrop-blur-[2px] animate-fade-in" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="AI Coach"
            className="relative z-10 flex w-full flex-col bg-card shadow-modal animate-slide-up
                       h-[80vh] rounded-t-2xl
                       sm:h-[600px] sm:max-h-[85vh] sm:w-[400px] sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero">
                <CoachIcon size={18} className="text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[15px] font-[800] text-dark-text">AI Coach <LightningIcon size={13} className="text-teal" /></div>
                <div className="truncate text-[11px] text-gray">Knows your numbers · {ctx.label}</div>
              </div>
              <Link href="/coach" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-[12px] font-[700] text-navy hover:bg-navy/5">Open full →</Link>
              <button onClick={() => setOpen(false)} aria-label="Close coach" className="flex h-9 w-9 items-center justify-center rounded-full text-gray hover:bg-bdrbg hover:text-dark-text">
                <CloseIcon size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-bdrbg p-4">
                    <p className="text-[14px] font-[700] text-dark-text">Hey{firstName ? `, ${firstName}` : ''} 👋</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-mid-text">
                      I&apos;m your coach in your pocket — I already know your belt, your pace to goal, your pipeline, and your wins. Ask me anything, anytime.
                    </p>
                  </div>
                  <button
                    onClick={() => send("Give me my game plan for today: where I stand against my monthly goal, my single biggest opportunity right now, and the top 3 specific actions that move my number most. Use my real data and be concrete.")}
                    className="flex w-full items-center gap-3 rounded-2xl bg-gradient-hero p-3.5 text-left text-white shadow-card transition-transform active:scale-[0.99]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><LightningIcon size={18} className="text-white" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-[800]">Today&apos;s game plan</div>
                      <div className="text-[11px] text-white/75">Where you stand & your top 3 moves</div>
                    </div>
                    <ArrowRightIcon size={16} className="shrink-0 text-white/80" />
                  </button>
                  <div>
                    <p className="mb-2 text-[11px] font-[800] uppercase tracking-wide text-gray">Right now on {ctx.label}</p>
                    <div className="space-y-2">
                      {ctx.prompts.map(pr => (
                        <button key={pr} onClick={() => send(pr)}
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-[13px] text-mid-text transition-all hover:border-teal/50 hover:bg-teal/5">
                          {pr}<ArrowRightIcon size={15} className="shrink-0 text-gray" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(m => (
                    <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                      {m.role === 'assistant' && (
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-hero"><CoachIcon size={12} className="text-white" /></div>
                      )}
                      <div className={cn('max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                        m.role === 'user' ? 'rounded-tr-sm bg-navy text-white' : 'rounded-tl-sm border border-border bg-card text-dark-text shadow-card')}>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-hero"><CoachIcon size={12} className="text-white" /></div>
                      <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-card">
                        <div className="flex h-3 items-center gap-1">
                          {[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-bdrbg p-1.5">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Ask your coach…"
                  rows={1}
                  className="max-h-28 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] outline-none placeholder-gray"
                  onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }}
                />
                <button onClick={() => send()} disabled={!input.trim() || loading} aria-label="Send"
                  className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                    input.trim() && !loading ? 'bg-navy text-white hover:bg-navy-dark' : 'bg-card text-gray')}>
                  <ArrowRightIcon size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
