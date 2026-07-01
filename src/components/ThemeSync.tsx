'use client'

// Hydrates the user's saved theme (from Supabase, passed by the server layout)
// on boot: the profile is authoritative, so we reconcile localStorage + apply,
// and bind the OS listener so 'system' base updates live. The no-flash script in
// the root layout already painted from localStorage; this corrects a fresh
// device where localStorage hasn't been seeded yet.

import { useEffect } from 'react'
import { applyTheme, setStoredTheme, bindSystemBase, getStoredTheme, type BaseMode, type Accent } from '@/lib/theme'

export function ThemeSync({ base, accent }: { base?: string | null; accent?: string | null }) {
  useEffect(() => {
    const b = (base as BaseMode) || 'dark'
    const a = (accent as Accent) || 'brand'
    setStoredTheme(b, a)
    applyTheme(b, a)
    bindSystemBase(() => getStoredTheme().base)
  }, [base, accent])
  return null
}
