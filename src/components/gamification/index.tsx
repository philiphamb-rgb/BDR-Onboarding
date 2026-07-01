// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { BeltIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'

// ─── XP Float Pop ────────────────────────────────────────────────────────────

interface XpPopProps {
  amount: number
  x?: number
  y?: number
  onComplete?: () => void
}

export function XpPop({ amount, x = 50, y = 50, onComplete }: XpPopProps) {
  const [phase, setPhase] = useState<'rise' | 'fade' | 'done'>('rise')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fade'), 700)
    const t2 = setTimeout(() => { setPhase('done'); onComplete?.() }, 1200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onComplete])

  if (phase === 'done') return null

  return (
    <div
      className={cn(
        'fixed z-[500] pointer-events-none select-none',
        'flex items-center gap-1 bg-gold/10 border border-gold/30 text-gold',
        'text-sm font-bold px-3 py-1 rounded-full',
        'transition-all duration-500',
        phase === 'rise' && 'translate-y-0 opacity-100',
        phase === 'fade' && '-translate-y-6 opacity-0'
      )}
      style={{ left: `${x}px`, top: `${y}px`, transform: 'translateX(-50%)' }}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      +{amount}
    </div>
  )
}

// ─── XP Pop Manager ──────────────────────────────────────────────────────────

interface XpPopItem {
  id: string
  amount: number
  x: number
  y: number
}

let popItems: XpPopItem[] = []
let listeners: (() => void)[] = []

export function triggerXpPop(amount: number, x?: number, y?: number) {
  const id = Math.random().toString(36).slice(2)
  popItems = [...popItems, {
    id,
    amount,
    x: x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 200),
    y: y ?? (typeof window !== 'undefined' ? window.innerHeight - 160 : 400),
  }]
  listeners.forEach(l => l())
}

export function XpPopLayer() {
  const [items, setItems] = useState<XpPopItem[]>([])
  const [mounted, setMounted] = useState(false)

  const update = useCallback(() => setItems([...popItems]), [])

  useEffect(() => {
    setMounted(true)
    listeners.push(update)
    return () => { listeners = listeners.filter(l => l !== update) }
  }, [update])

  const remove = useCallback((id: string) => {
    popItems = popItems.filter(p => p.id !== id)
    setItems([...popItems])
  }, [])

  if (!mounted || items.length === 0) return null

  return createPortal(
    <>
      {items.map(item => (
        <XpPop key={item.id} amount={item.amount} x={item.x} y={item.y} onComplete={() => remove(item.id)} />
      ))}
    </>,
    document.body
  )
}

// ─── Belt Advance Celebration ─────────────────────────────────────────────────

interface BeltCelebrationProps {
  beltName: string
  beltColor: string
  xpEarned: number
  onClose: () => void
}

const CONFETTI_COLORS = ['rgb(var(--teal))', 'rgb(var(--gold))', 'rgb(var(--navy))', '#00C97A', '#6D28D9', '#fff']

function Particle({ color, delay, x }: { color: string; delay: number; x: number }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-sm animate-belt-confetti"
      style={{
        backgroundColor: color,
        left: `${x}%`,
        top: '-8px',
        animationDelay: `${delay}ms`,
        animationDuration: `${1200 + Math.random() * 600}ms`,
        transform: `rotate(${Math.random() * 360}deg)`,
      }}
    />
  )
}

export function BeltCelebration({ beltName, beltColor, xpEarned, onClose }: BeltCelebrationProps) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    setMounted(true)
    const t = setTimeout(() => handleClose(), 7000)
    return () => clearTimeout(t)
  }, [])

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 400)
  }

  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 800,
    x: Math.random() * 100,
  }))

  if (!mounted) return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[600] flex flex-col items-center justify-center',
        'bg-dark-text/80 backdrop-blur-sm',
        'transition-opacity duration-400',
        closing ? 'opacity-0' : 'opacity-100'
      )}
      onClick={handleClose}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <Particle key={p.id} color={p.color} delay={p.delay} x={p.x} />
        ))}
      </div>

      {/* Belt card */}
      <div
        className={cn(
          'relative bg-card rounded-3xl p-8 mx-6 text-center shadow-2xl max-w-sm w-full',
          'animate-pop',
          closing && 'scale-95 opacity-0 transition-all duration-400'
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Belt color band */}
        <div
          className="w-20 h-3 rounded-full mx-auto mb-6"
          style={{ backgroundColor: beltColor }}
        />

        <div className="mb-4 flex justify-center"><span style={{ color: beltColor }}><BeltIcon size={52} /></span></div>

        <h2 className="text-2xl font-bold text-dark-text mb-2">Belt Earned!</h2>
        <p className="text-3xl font-black mb-1" style={{ color: beltColor }}>{beltName}</p>
        <p className="text-sm text-gray mb-6">You&apos;ve leveled up. Keep going.</p>

        {xpEarned > 0 && (
          <div className="flex items-center justify-center gap-2 bg-gold/10 rounded-xl px-4 py-2 mb-6">
            <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-gold font-bold text-lg">+{xpEarned} XP</span>
          </div>
        )}

        <button
          onClick={handleClose}
          className="w-full py-3 bg-gradient-to-r from-teal to-teal-dark text-white font-bold rounded-2xl text-base shadow-button active:scale-95 transition-transform"
        >
          Keep it up
        </button>
      </div>
    </div>,
    document.body
  )
}

// ─── Confetti Burst ───────────────────────────────────────────────────────────
// A lightweight, self-removing full-screen confetti burst for moments of delight
// (e.g. passing a module quiz). Render it conditionally; it cleans itself up.

export function Confetti({ count = 36, duration = 2600 }: { count?: number; duration?: number }) {
  const [show, setShow] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShow(false), duration)
    return () => clearTimeout(t)
  }, [duration])
  if (!show || typeof document === 'undefined') return null
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 500,
    x: Math.random() * 100,
  }))
  return createPortal(
    <div className="fixed inset-0 z-[450] overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map(p => <Particle key={p.id} color={p.color} delay={p.delay} x={p.x} />)}
    </div>,
    document.body
  )
}

// ─── Belt Watcher ─────────────────────────────────────────────────────────────
// Mounted in the app shell. Detects a genuine belt advance (current belt, derived
// from belt_day, has moved past the last belt we celebrated) and fires the
// celebration exactly once, persisting the new belt so it never re-fires.

// Belt rank -> color, keyed by the LABEL form the DB stores ('White Belt', ...).
const BELT_COLOR: Record<string, string> = {
  'White Belt': '#9CA3AF', 'Yellow Belt': '#CA8A04', 'Orange Belt': '#C2410C',
  'Green Belt': '#059669', 'Blue Belt': '#1D4ED8', 'Purple Belt': '#6D28D9', 'Black Belt': '#111827',
}

export function BeltWatcher({ userId }: { userId?: string }) {
  const supabase = createClient()
  const [celebration, setCelebration] = useState<{ name: string; color: string } | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      // Drive the celebration off the unread belt_advance notification that
      // calculate-xp creates on a real advance. This avoids any belt-format
      // mismatch and the race where calculate-xp updates last_belt_name first.
      const { data: notif } = await supabase
        .from('notifications')
        .select('id, title')
        .eq('user_id', userId).eq('type', 'belt_advance').eq('is_read', false)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!notif || cancelled) return
      const label = (notif.title ?? '').replace('You just earned', '').trim() || 'New Belt'
      setCelebration({ name: label, color: BELT_COLOR[label] ?? 'rgb(var(--teal))' })
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
    })()
    return () => { cancelled = true }
  }, [userId])

  if (!celebration) return null
  return (
    <BeltCelebration
      beltName={celebration.name}
      beltColor={celebration.color}
      xpEarned={0}
      onClose={() => setCelebration(null)}
    />
  )
}

// ─── Habit Checkmark SVG Animation ──────────────────────────────────────────

interface AnimatedCheckProps {
  checked: boolean
  size?: number
  color?: string
  className?: string
  onToggle?: () => void
}

export function AnimatedCheck({
  checked,
  size = 24,
  color = 'rgb(var(--teal))',
  className,
  onToggle,
}: AnimatedCheckProps) {
  const r = size / 2 - 2
  const circumference = 2 * Math.PI * r

  return (
    <button
      onClick={onToggle}
      className={cn('flex items-center justify-center transition-transform active:scale-90', className)}
      style={{ width: size, height: size }}
      aria-label={checked ? 'Mark incomplete' : 'Mark complete'}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        className="transition-all duration-300"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={checked ? color : '#D1D5DB'}
          strokeWidth="2"
          fill={checked ? color : 'transparent'}
          className="transition-all duration-300"
        />

        {/* Animated stroke circle (fills when checked) */}
        {!checked && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth="2"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}

        {/* Checkmark path - draws itself when checked */}
        {checked && (
          <path
            d={`M${size * 0.25} ${size * 0.5} L${size * 0.45} ${size * 0.7} L${size * 0.75} ${size * 0.33}`}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-check-draw"
          />
        )}
      </svg>
    </button>
  )
}
