// Shared progress ring for the goal cockpit on Home and Today. Sizing,
// stroke, and colors are props so it reads correctly on a gradient hero
// (white on translucent track) or on a light card (teal on gray track).
export function GoalRing({
  pct,
  size = 60,
  stroke = 5,
  track = 'rgba(255,255,255,0.22)',
  bar = 'white',
}: {
  pct: number
  size?: number
  stroke?: number
  track?: string
  bar?: string
}) {
  const r = size / 2 - stroke / 2 - 1
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const off = c * (1 - clamped / 100)
  return (
    <div className="relative shrink-0" style={{ height: size, width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bar} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 0.9s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-[800]" style={{ color: bar, fontSize: size * 0.23 }}>{pct}%</span>
    </div>
  )
}
