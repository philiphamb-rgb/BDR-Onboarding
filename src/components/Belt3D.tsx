// A high-quality 3D-look belt emblem (SVG). True WebGL 3D isn't worth the weight
// in this stack, so this is a convincing 3D treatment: per-rank gradients (top
// light → bottom dark), a glossy highlight, a knot with its own shading, hanging
// tails, and a soft contact shadow. Crisp at any resolution, no external assets.

const PALETTE: Record<string, { light: string; base: string; dark: string }> = {
  white:  { light: '#F3F4F6', base: '#9CA3AF', dark: '#6B7280' },
  yellow: { light: '#FDE68A', base: '#FBBF24', dark: '#D97706' },
  orange: { light: '#FDBA74', base: '#F97316', dark: '#C2410C' },
  green:  { light: '#86EFAC', base: '#22C55E', dark: '#15803D' },
  blue:   { light: '#93C5FD', base: '#3B82F6', dark: '#1D4ED8' },
  purple: { light: '#C4B5FD', base: '#9333EA', dark: '#6D28D9' },
  black:  { light: '#4B5563', base: '#1F2937', dark: '#030712' },
}

export function Belt3D({ belt = 'white', size = 56, className }: { belt?: string; size?: number; className?: string }) {
  const c = PALETTE[belt] ?? PALETTE.white
  const id = `belt-${belt}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset="1" stopColor={c.base} />
        </linearGradient>
        <linearGradient id={`${id}-knot`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.base} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
        <linearGradient id={`${id}-tail`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.base} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
      </defs>

      {/* contact shadow */}
      <ellipse cx="32" cy="57" rx="19" ry="3.2" fill="#0d1f3c" opacity="0.14" />

      {/* hanging tails */}
      <g>
        <rect x="25.5" y="38" width="6" height="16" rx="2" fill={`url(#${id}-tail)`} transform="rotate(7 28 46)" />
        <rect x="32.5" y="38" width="6" height="16" rx="2" fill={`url(#${id}-tail)`} transform="rotate(-7 36 46)" />
        {/* tail tips (cut ends, slightly darker) */}
        <rect x="25.5" y="51" width="6" height="3" rx="1.2" fill={c.dark} opacity="0.5" transform="rotate(7 28 52)" />
        <rect x="32.5" y="51" width="6" height="3" rx="1.2" fill={c.dark} opacity="0.5" transform="rotate(-7 36 52)" />
      </g>

      {/* main belt band */}
      <rect x="5" y="25" width="54" height="15" rx="4.5" fill={`url(#${id}-band)`} stroke={c.dark} strokeOpacity="0.25" />
      {/* glossy highlight on the band */}
      <rect x="8" y="27.5" width="48" height="3.5" rx="1.75" fill="#ffffff" opacity="0.28" />

      {/* center knot */}
      <rect x="23" y="20" width="18" height="22" rx="4" fill={`url(#${id}-knot)`} stroke={c.dark} strokeOpacity="0.35" />
      {/* knot highlight + crease */}
      <rect x="26" y="22.5" width="5" height="17" rx="2" fill="#ffffff" opacity="0.18" />
      <rect x="31.5" y="21" width="2" height="20" rx="1" fill={c.dark} opacity="0.4" />
    </svg>
  )
}
