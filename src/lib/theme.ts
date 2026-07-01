'use client'

// Theme selection — dark (default), light, or system. The actual palette lives
// in CSS variables (globals.css); this just toggles the `.light` class on <html>
// and persists the choice. The no-flash init script in layout.tsx applies the
// stored choice before first paint; this module keeps it in sync at runtime.

export type ThemeChoice = 'dark' | 'light' | 'system'

export function getTheme(): ThemeChoice {
  try { return (localStorage.getItem('theme') as ThemeChoice) || 'dark' } catch { return 'dark' }
}

export function applyTheme(t: ThemeChoice) {
  if (typeof document === 'undefined') return
  const isLight = t === 'light' || (t === 'system' && typeof matchMedia !== 'undefined' && !matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('light', isLight)
}

export function setTheme(t: ThemeChoice) {
  try { localStorage.setItem('theme', t) } catch {}
  applyTheme(t)
}
