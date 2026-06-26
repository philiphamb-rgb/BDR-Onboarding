// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Button } from '@/components/ui'
import { ArrowRightIcon, TargetIcon } from '@/components/icons'
import { cn, formatRelativeTime } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

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
        supabase.from('users').select('first_name').eq('id', user.id).single()
          .then(({ data }) => setUserName(data?.first_name ?? ''))
      }
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const messageText = text ?? input.trim()
    if (!messageText || loading || !userId) return

    const userMsg: Message = {
      id: Date.now().toString(),
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

      if (!res.ok) throw new Error('Failed to get response')
      const data = await res.json()

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
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
          <TargetIcon className="text-gold" />
        </div>
        <div>
          <h1 className="text-h2 text-dark-text">Coach AI</h1>
          <p className="text-xs text-gray">Your personal performance coach</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="space-y-4">
            {/* Welcome */}
            <Card className="text-center py-6">
              <div className="mb-3 flex justify-center"><TargetIcon size={36} className="text-gold" /></div>
              <h2 className="text-base font-semibold text-dark-text mb-2">
                Hey{userName ? `, ${userName}` : ''}! I&apos;m your Coach.
              </h2>
              <p className="text-sm text-gray">
                Ask me anything about sales techniques, handling objections, improving your metrics, or setting goals.
              </p>
            </Card>

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
                    <TargetIcon size={14} className="text-gold" />
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

            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <TargetIcon size={14} className="text-gold" />
                </div>
                <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
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
      <div className="flex-shrink-0">
        <div className="flex gap-2 items-end bg-white rounded-2xl border border-border shadow-card p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach..."
            rows={1}
            className="flex-1 resize-none border-none outline-none text-sm py-2 px-2 placeholder-gray-400 max-h-32 bg-transparent"
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
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
              input.trim() && !loading ? 'bg-navy text-white hover:bg-navy-dark' : 'bg-bdrbg text-gray'
            )}
          >
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
