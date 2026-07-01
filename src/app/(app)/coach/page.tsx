// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, Button } from '@/components/ui'
import { ArrowRightIcon, TargetIcon, CoachIcon } from '@/components/icons'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Tour } from '@/components/tour'
import { COACH_TOUR } from '@/lib/tours'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

const QUICK_PROMPTS = [
  'How can I improve my close rate?',
  'Give me tips for handling objections',
  'What should I focus on this week?',
  'Help me with my pitch',
  'How do I get more demos booked?',
  "Analyze my recent performance",
]

export default function CoachPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        supabase.from('users').select('first_name, name').eq('id', user.id).single()
          .then(({ data }) => setUserName(data?.first_name || (data?.name ?? '').split(' ')[0] || ''))
      }
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Pick up a pre-seeded prompt handed off from another screen (e.g. the Drill's
  // "Discuss with Coach") and send it once the user is known.
  useEffect(() => {
    if (!userId) return
    let seed: string | null = null
    try { seed = sessionStorage.getItem('coachSeed'); if (seed) sessionStorage.removeItem('coachSeed') } catch { /* ignore */ }
    if (seed) sendMessage(seed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const sendMessage = async (text?: string) => {
    const messageText = text ?? input.trim()
    if (!messageText || loading || !userId) return

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          userId,
          history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) throw new Error('Failed to get response')

      // Stream the reply in as it arrives. The assistant bubble is created on
      // the first token, so the typing dots stay visible until then.
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
          setMessages((prev) => [...prev, { id, role: 'assistant', content: acc, timestamp: new Date() }])
        } else {
          setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: acc } : m)))
        }
      }
      if (!aiId) {
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: "I couldn't generate a response. Please try again.", timestamp: new Date() }])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] desktop:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
          <CoachIcon className="text-gold" />
        </div>
        <div>
          <h1 className="text-h2 text-dark-text">AI Coach</h1>
          <p className="text-xs text-gray">Your personal performance coach</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="space-y-4">
            {/* Welcome */}
            <Card className="text-center py-6">
              <div className="mb-3 flex justify-center"><CoachIcon size={36} className="text-gold" /></div>
              <h2 className="text-base font-semibold text-dark-text mb-2">
                Hey{userName ? `, ${userName}` : ''}! I&apos;m your Coach.
              </h2>
              <p className="text-sm text-gray">
                Ask me anything about sales techniques, handling objections, improving your metrics, or setting goals.
              </p>
            </Card>

            {/* Practice CTA */}
            <Link href="/drill">
              <Card className="flex items-center gap-3 bg-gradient-hero text-white hover:-translate-y-0.5 transition-transform">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shrink-0">
                  <TargetIcon size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-[800]">Objection Drill</div>
                  <div className="text-[12px] text-white/70">Practice live against an AI prospect, then get Sandler feedback.</div>
                </div>
                <ArrowRightIcon size={18} className="text-white/80 shrink-0 animate-nudge-x" />
              </Card>
            </Link>

            {/* Quick prompts */}
            <div>
              <p className="text-xs text-gray mb-2 font-medium">QUICK START</p>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left px-4 py-3 bg-white rounded-xl border border-border hover:border-navy/40 hover:bg-navy/5 transition-all text-sm text-mid-text flex items-center justify-between gap-2"
                  >
                    {prompt}
                    <ArrowRightIcon className="w-4 h-4 text-gray flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CoachIcon size={14} className="text-gold" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-navy text-white rounded-tr-sm'
                      : 'bg-white border border-border text-dark-text rounded-tl-sm shadow-card'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={cn('text-xs mt-1', msg.role === 'user' ? 'text-white/50' : 'text-gray')}>
                    {formatRelativeTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <CoachIcon size={14} className="text-gold" />
                </div>
                <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-gray rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0" data-tour="coach-input">
        <div className="flex gap-2 items-end bg-white rounded-2xl border border-border shadow-card p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach..."
            rows={1}
            className="flex-1 resize-none border-none outline-none text-sm py-2 px-2 placeholder-gray max-h-32 bg-transparent"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
              input.trim() && !loading ? 'bg-navy text-white hover:bg-navy-dark' : 'bg-bdrbg text-gray'
            )}
          >
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Tour tourKey="coach" steps={COACH_TOUR} />
    </div>
  )
}
