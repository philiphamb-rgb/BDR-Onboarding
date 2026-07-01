'use client'

// A whisper-light route transition: each pathname change replays a 250ms
// fade-up on the page content so navigation feels fluid instead of hard-cutting.
// Keyed on the pathname so the animation re-fires per route; honors
// prefers-reduced-motion via the global rule that disables .animate-fade-up.

import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  )
}
