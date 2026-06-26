// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Badge, SkeletonCard, EmptyState } from '@/components/ui'
import { BackIcon, XpIcon, ExternalLinkIcon, CopyIcon, BookIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui'

interface LessonRow {
  id: string; module_id: string; title: string; duration_minutes: number | null;
  difficulty: string; content: ContentBlock[]; sources: unknown[]
}
interface LinkItem { text: string; url?: string; sub?: string }
interface ContentBlock {
  type: 'intro' | 'list' | 'tip' | 'warn' | 'screenshot' | 'quote' | 'heading' | 'steps' | 'links' | 'template'
  text?: string
  items?: { text: string; source?: string; url?: string }[]
  links?: LinkItem[]
  src?: string
  caption?: string
  cite?: string
}

export default function LessonPage() {
  const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>()
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string>()
  const [lesson, setLesson] = useState<LessonRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [readPct, setReadPct] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); fetchLesson(user.id) }
    })
  }, [lessonId])

  // Reading-progress bar: how far through the page the rep has scrolled.
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      setReadPct(max > 0 ? Math.min(100, Math.round((h.scrollTop / max) * 100)) : 100)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lesson])

  const fetchLesson = async (uid: string) => {
    const [{ data: l }, { data: prog }] = await Promise.all([
      supabase.from('lessons').select('*').eq('id', lessonId).single(),
      supabase.from('user_progress').select('completed_lessons').eq('user_id', uid).single(),
    ])
    setLesson(l)
    setAlreadyDone((prog?.completed_lessons ?? []).includes(lessonId))
    setLoading(false)
  }

  const markComplete = async () => {
    if (!userId || alreadyDone) return
    setCompleting(true)
    try {
      // Add to completed_lessons array
      const { data: prog } = await supabase.from('user_progress').select('completed_lessons').eq('user_id', userId).single()
      const existing = prog?.completed_lessons ?? []
      if (!existing.includes(lessonId)) {
        await supabase.from('user_progress').update({ completed_lessons: [...existing, lessonId] }).eq('user_id', userId)
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'lesson_complete', user_id: userId, lesson_id: lessonId }),
        })
        if (res.ok) {
          const { xp_earned } = await res.json()
          toast.xp(xp_earned ?? 0, 'Lesson complete!')
        }
      }
      setAlreadyDone(true)
      // Let the XP reward toast land before navigating away (protects the
      // positive-feedback loop from being cut off by the route change).
      await new Promise((r) => setTimeout(r, 850))
      router.push(`/train/${moduleId}`)
    } finally { setCompleting(false) }
  }

  // Lightweight inline emphasis: **bold** -> <strong>
  const rich = (t?: string) => {
    if (!t) return null
    return t.split(/(\*\*[^*]+\*\*)/g).map((part, k) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={k} className="font-[800] text-dark-text">{part.slice(2, -2)}</strong>
        : <span key={k}>{part}</span>
    )
  }

  const renderBlock = (block: ContentBlock, i: number) => {
    if (block.type === 'intro') return (
      <p key={i} className="text-mid-text leading-relaxed text-sm">{rich(block.text)}</p>
    )
    if (block.type === 'list') return (
      <ul key={i} className="space-y-2">
        {block.items?.map((item, j) => (
          <li key={j} className="flex items-start gap-2 text-mid-text">
            <div className="w-1.5 h-1.5 bg-navy rounded-full mt-2 flex-shrink-0" />
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-navy font-medium underline decoration-navy/30 hover:decoration-navy inline-flex items-center gap-1">
                {item.text}<ExternalLinkIcon size={12} />
              </a>
            ) : (
              <span className="text-sm">{rich(item.text)}</span>
            )}
          </li>
        ))}
      </ul>
    )
    if (block.type === 'heading') return (
      <h2 key={i} className="text-base font-[800] text-dark-text pt-2">{block.text}</h2>
    )
    if (block.type === 'steps') return (
      <ol key={i} className="space-y-3">
        {block.items?.map((item, j) => (
          <li key={j} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-navy text-white text-xs font-[800] flex items-center justify-center shrink-0">{j + 1}</span>
            <span className="text-sm text-mid-text pt-0.5">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-navy font-medium underline decoration-navy/30 hover:decoration-navy inline-flex items-center gap-1">{item.text}<ExternalLinkIcon size={12} /></a>
              ) : rich(item.text)}
            </span>
          </li>
        ))}
      </ol>
    )
    if (block.type === 'links') return (
      <div key={i} className="space-y-2">
        {block.links?.map((lnk, j) => {
          const inner = (
            <>
              <div className="min-w-0">
                <div className="text-sm font-[700] text-dark-text truncate">{lnk.text}</div>
                {lnk.sub && <div className="text-xs text-gray truncate">{lnk.sub}</div>}
              </div>
              {lnk.url && <ExternalLinkIcon size={15} className="text-gray group-hover:text-teal shrink-0" />}
            </>
          )
          return lnk.url ? (
            <a key={j} href={lnk.url} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:border-teal transition-colors group">
              {inner}
            </a>
          ) : (
            <div key={j} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
              {inner}
            </div>
          )
        })}
      </div>
    )
    if (block.type === 'template') return (
      <div key={i} className="rounded-xl border border-border bg-bdrbg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-white">
          <span className="text-[11px] font-[800] uppercase tracking-wide text-gray">{block.caption ?? 'Copy & paste'}</span>
          <button
            onClick={() => { navigator.clipboard?.writeText(block.text ?? ''); toast.success?.('Copied to clipboard') }}
            className="flex items-center gap-1 text-[11px] font-[700] text-teal hover:text-teal-dark"
          >
            <CopyIcon size={13} /> Copy
          </button>
        </div>
        <pre className="px-3 py-3 text-xs text-mid-text whitespace-pre-wrap break-words font-sans leading-relaxed max-w-full overflow-x-auto">{block.text}</pre>
      </div>
    )
    if (block.type === 'tip') return (
      <div key={i} className="border-l-4 border-teal bg-teal/5 rounded-r-xl px-4 py-3">
        <div className="text-xs font-bold text-teal mb-1 uppercase tracking-wide">Pro Tip</div>
        <p className="text-sm text-mid-text">{rich(block.text)}</p>
      </div>
    )
    if (block.type === 'warn') return (
      <div key={i} className="border-l-4 border-gold bg-gold/5 rounded-r-xl px-4 py-3">
        <div className="text-xs font-bold text-gold mb-1 uppercase tracking-wide">Important</div>
        <p className="text-sm text-mid-text">{rich(block.text)}</p>
      </div>
    )
    if (block.type === 'quote') return (
      <blockquote key={i} className="border-l-4 border-border pl-4 italic text-gray text-sm">
        {block.text}
        {block.cite && <cite className="block mt-1 text-xs not-italic text-gray">— {block.cite}</cite>}
      </blockquote>
    )
    if (block.type === 'screenshot') return (
      <figure key={i} className="rounded-xl border border-border overflow-hidden bg-bdrbg">
        {block.src
          ? <img src={block.src} alt={block.caption ?? ''} className="w-full" />
          : <div className="aspect-video flex items-center justify-center text-gray text-xs">Illustration</div>}
        {block.caption && <figcaption className="px-3 py-2 text-xs text-gray border-t border-border bg-white">{block.caption}</figcaption>}
      </figure>
    )
    return null
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>
  if (!lesson) return (
    <EmptyState
      icon={<BookIcon size={28} />}
      title="Lesson not found"
      description="This lesson may have moved or isn't available yet. Head back to the module to keep going."
      action={{ label: 'Back to module', onClick: () => router.push(`/train/${moduleId}`) }}
    />
  )

  const content = Array.isArray(lesson.content) ? lesson.content : []

  return (
    <div className="space-y-4">
      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 z-[120] h-1 bg-transparent desktop:left-[240px]">
        <div className="h-full bg-gradient-primary transition-[width] duration-150" style={{ width: `${readPct}%` }} />
      </div>

      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray hover:text-dark-text">
        <BackIcon className="w-4 h-4" />Back
      </button>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge className="text-xs capitalize">{lesson.difficulty}</Badge>
          {lesson.duration_minutes && <span className="text-xs text-gray">{lesson.duration_minutes} min read</span>}
          {alreadyDone && <Badge color="success" className="text-xs">Completed</Badge>}
        </div>
        <h1 className="text-h1 text-dark-text">{lesson.title}</h1>
      </div>

      {content.length > 0 ? (
        <Card>
          <div className="space-y-4">{content.map((block, i) => renderBlock(block, i))}</div>
        </Card>
      ) : (
        <Card>
          <p className="text-gray text-sm">Content coming soon.</p>
        </Card>
      )}

      <Button
        onClick={markComplete}
        loading={completing}
        disabled={alreadyDone}
        variant={alreadyDone ? 'secondary' : 'conversion'}
        fullWidth
        size="lg"
        icon={!alreadyDone ? <XpIcon size={18} /> : undefined}
        iconPosition="right"
      >
        {alreadyDone ? 'Lesson Complete' : 'Mark Complete & Earn XP'}
      </Button>
    </div>
  )
}
