// @ts-nocheck
'use client'

import { useEffect, useRef, useState } from 'react'

// Animates a number from 0 up to `value` on mount / when value changes. Eases
// out so it lands softly. Honors reduced-motion (snaps straight to the value).
export function CountUp({ value, duration = 750, format }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [n, setN] = useState(0)
  const raf = useRef<number>()
  const start = useRef<number | null>(null)

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduce || !value || value <= 0) { setN(value || 0); return }
    start.current = null
    const tick = (ts: number) => {
      if (start.current == null) start.current = ts
      const p = Math.min(1, (ts - start.current) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(value * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value, duration])

  return <>{format ? format(n) : n}</>
}
