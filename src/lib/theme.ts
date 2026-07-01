'use client'

// Theming — two independent axes:
//   • base:   'light' | 'dark' | 'system'   (neutral palette)
//   • accent: 'brand' | '#RRGGBB'           ('brand' = ConsumerDirect palette;
//                                             a hex = single custom accent)
// The palettes live as CSS channels in globals.css. This module toggles the
// `.light` class for the base and, for a custom accent, writes inline channel
// overrides on <html>. Choices persist to localStorage (fast, pre-paint via the
// no-flash script in layout.tsx) and to Supabase (users.theme / users.accent_color)
// for cross-device. 'brand' is the default.

export type BaseMode = 'light' | 'dark' | 'system'
export type Accent = 'brand' | string // 'brand' or '#RRGGBB'

const LS_BASE = 'themeBase'
const LS_ACCENT = 'themeAccent'

export function getStoredTheme(): { base: BaseMode; accent: Accent } {
  try {
    const base = (localStorage.getItem(LS_BASE) as BaseMode) || 'dark'
    const accent = localStorage.getItem(LS_ACCENT) || 'brand'
    return { base, accent }
  } catch { return { base: 'dark', accent: 'brand' } }
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return null
  const int = parseInt(m[1], 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}
const channels = (rgb: [number, number, number]) => `${rgb[0]} ${rgb[1]} ${rgb[2]}`
const scale = (rgb: [number, number, number], f: number): [number, number, number] =>
  [clamp(rgb[0] * f), clamp(rgb[1] * f), clamp(rgb[2] * f)]

export function isLightBase(base: BaseMode): boolean {
  if (base === 'light') return true
  if (base === 'dark') return false
  return typeof matchMedia !== 'undefined' && !matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyBase(base: BaseMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('light', isLightBase(base))
}

export function applyAccent(accent: Accent) {
  if (typeof document === 'undefined') return
  const el = document.documentElement.style
  const custom = ['--navy', '--navy-dark', '--navy-mid', '--teal', '--teal-dark', '--gold']
  if (accent === 'brand' || !hexToRgb(accent)) {
    // Fall back to the brand defaults defined in :root.
    custom.forEach(v => el.removeProperty(v))
    return
  }
  const rgb = hexToRgb(accent)!
  // The single custom color drives every accent token; status red stays put.
  el.setProperty('--navy', channels(rgb))
  el.setProperty('--navy-dark', channels(scale(rgb, 0.8)))
  el.setProperty('--navy-mid', channels(scale(rgb, 1.18)))
  el.setProperty('--teal', channels(rgb))
  el.setProperty('--teal-dark', channels(scale(rgb, 0.82)))
  el.setProperty('--gold', channels(rgb))
}

export function applyTheme(base: BaseMode, accent: Accent, animate = false) {
  if (typeof document === 'undefined') return
  if (animate) {
    document.documentElement.classList.add('theme-transition')
    setTimeout(() => document.documentElement.classList.remove('theme-transition'), 360)
  }
  applyBase(base)
  applyAccent(accent)
  // Navy-as-text token: readable on the current base. On a dark base a custom
  // accent is lightened so small text keeps contrast; on light it stays as-picked.
  const el = document.documentElement.style
  const rgb = accent !== 'brand' ? hexToRgb(accent) : null
  if (rgb) el.setProperty('--navy-ink', channels(isLightBase(base) ? rgb : scale(rgb, 1.35)))
  else el.removeProperty('--navy-ink')  // brand → fall back to :root / .light values
}

export function setStoredTheme(base: BaseMode, accent: Accent) {
  try { localStorage.setItem(LS_BASE, base); localStorage.setItem(LS_ACCENT, accent) } catch {}
}

// Keep 'system' base live: re-apply if the OS scheme flips mid-session.
let mediaBound = false
export function bindSystemBase(getBase: () => BaseMode) {
  if (mediaBound || typeof matchMedia === 'undefined') return
  mediaBound = true
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getBase() === 'system') applyBase('system')
  })
}
