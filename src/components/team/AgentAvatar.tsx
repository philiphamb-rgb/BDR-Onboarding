// @ts-nocheck
'use client'

// High-fidelity procedural caricature for an AI teammate. Every agent gets a
// distinct, characterful illustrated portrait — gradient-shaded skin, big
// expressive eyes with catchlights, varied hair/brows/mouths/facial-hair,
// glasses, blush, freckles, a collared outfit, and a department-tinted studio
// backdrop — generated deterministically from the agent id (same id → same face
// forever). Pure inline SVG so it's crisp at any size and CSP-safe (no external
// images). Eyes blink + the portrait gently breathes; a teal presence ring
// pulses when the agent is live. Designed to feel fun, premium, and alive.

// ── Palettes ────────────────────────────────────────────────────────────────
const SKIN = ['#FCE0C8', '#F7CBA4', '#EEB68C', '#E0A178', '#C9855C', '#A96A43', '#8A5433', '#6E4327']
const HAIR = ['#20160F', '#3B2417', '#5A3720', '#7A4B26', '#A06A34', '#C99A56', '#E4C07E', '#9AA0A8', '#6B7079', '#111318', '#B0472B', '#4A2E5E']
const IRIS = ['#5B3B22', '#3E2A1A', '#3C6E8F', '#4B7A5B', '#6A5140', '#2F5D6B', '#7A5C34']
const BLAZER = ['#22314F', '#12564F', '#3B4658', '#5A2E48', '#26405C', '#3A2E5C', '#134E52', '#5B4632', '#7A3A2C', '#2C3E66']
const SHIRT = ['#F4F6FA', '#E8EEF6', '#DCE6F2', '#EFE7DA', '#E6EDE8']
// Department studio backdrops (two-stop gradients tuned to feel cohesive).
const DEPT_BG: Record<string, [string, string]> = {
  exec: ['#3A4E86', '#1B2647'], marketing: ['#7A50A6', '#3C2560'],
  funnel: ['#2488A8', '#134963'], partner: ['#2AA06E', '#125438'],
  compliance: ['#C1663D', '#6E2F1E'], ops: ['#566579', '#2A3340'],
  memory: ['#5560C4', '#282E6A'], default: ['#3B4C74', '#1E2A44'],
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
// Lighten (amt>0) or darken (amt<0) a #rrggbb color.
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt }
  else { const a = 1 + amt; r *= a; g *= a; b *= a }
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}
function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

export function AgentAvatar({ agent, size = 44, live = false, float = false, ring = true, className = '' }: any) {
  const seed = hashStr(agent?.id || agent?.fullName || 'x')
  const b = (shift: number, mod: number) => (seed >>> shift) % mod
  const pick = (arr: any[], shift: number) => arr[(seed >>> shift) % arr.length]

  const skin = pick(SKIN, 2)
  const skinHi = shade(skin, 0.22), skinSh = shade(skin, -0.16), skinDeep = shade(skin, -0.3)
  const hair = pick(HAIR, 7), hairHi = shade(hair, 0.24), hairSh = shade(hair, -0.28)
  const iris = pick(IRIS, 11)
  const blazer = pick(BLAZER, 13), blazerHi = shade(blazer, 0.16)
  const shirt = pick(SHIRT, 5)
  const [bg0, bg1] = DEPT_BG[agent?.role?.department] || DEPT_BG.default

  const style = b(4, 11)        // hairstyle 0..10
  const brow = b(9, 3)          // brow shape
  const mouth = b(14, 5)        // expression
  const glasses = b(17, 5) === 0 ? (b(22, 3)) : -1   // ~20% wear glasses, 3 shapes
  const dark = lum(skin) < 0.45
  const beard = !dark ? b(19, 6) : b(19, 8)          // facial hair variant (0-1 = has it)
  const hasBeard = beard < 2 && style !== 5 && style !== 9
  const freckles = b(23, 7) === 0
  const blush = b(25, 4) === 0
  const uid = `a${seed.toString(36)}`
  const blinkDelay = `${((seed % 70) / 10).toFixed(1)}s`

  // Face geometry
  const cx = 100, headY = 96, headRx = 44, headRy = 49
  const eyeY = 96, eyeDx = 20, eyeR = 9

  // ── Hair ──────────────────────────────────────────────────────────────────
  const backHair = () => {
    if (style === 1 || style === 5) return null
    if (style === 3 || style === 6 || style === 8) // long
      return <path d={`M52 92 Q46 168 66 178 L134 178 Q154 168 148 92 Q148 40 100 40 Q52 40 52 92Z`} fill={hairSh} />
    if (style === 10) return <circle cx={cx} cy="88" r="62" fill={hairSh} /> // afro
    return <path d={`M56 96 Q52 46 100 46 Q148 46 144 96 L144 118 Q140 92 100 92 Q60 92 56 118Z`} fill={hairSh} />
  }
  const frontHair = () => {
    const fill = `url(#${uid}hair)`
    switch (style) {
      case 0: return <path d={`M56 92 Q52 44 100 44 Q148 44 144 92 Q140 66 118 62 Q104 74 88 66 Q70 60 56 92Z`} fill={fill} />
      case 1: return <path d={`M60 88 Q58 52 100 52 Q142 52 140 88 Q140 70 100 70 Q60 70 60 88Z`} fill={fill} />
      case 2: return <g fill={fill}><circle cx="70" cy="62" r="15" /><circle cx="92" cy="52" r="17" /><circle cx="112" cy="54" r="16" /><circle cx="132" cy="66" r="13" /><circle cx="60" cy="82" r="11" /><circle cx="142" cy="84" r="10" /></g>
      case 3: return <path d={`M54 92 Q50 42 100 42 Q150 42 146 92 Q136 62 100 60 Q64 62 54 92Z`} fill={fill} />
      case 4: return <g fill={fill}><circle cx="100" cy="34" r="16" /><path d={`M56 90 Q54 48 100 48 Q146 48 144 90 Q136 66 100 66 Q64 66 56 90Z`} /></g>
      case 5: return <path d={`M62 78 Q70 58 100 58 Q122 58 134 68 Q124 50 100 50 Q70 50 62 78Z`} fill={fill} opacity="0.95" />
      case 6: return <path d={`M54 94 Q52 44 100 44 Q148 44 146 94 Q140 66 124 64 Q116 74 100 72 Q84 70 76 64 Q60 66 54 94Z`} fill={fill} />
      case 7: return <path d={`M58 90 Q54 46 100 46 Q146 46 142 90 Q140 60 120 60 Q112 72 100 70 Q78 66 80 60 Q64 60 58 90Z`} fill={fill} />
      case 8: return <path d={`M54 92 Q50 42 100 42 Q150 42 146 92 Q136 60 100 58 Q64 60 54 92Z`} fill={fill} />
      case 9: return null // clean shaved
      case 10: return null // afro back only
      default: return null
    }
  }
  const facialHair = () => {
    if (!hasBeard) return null
    const f = hairSh
    if (beard === 0) return <path d={`M66 108 Q68 150 100 156 Q132 150 134 108 Q120 132 100 132 Q80 132 66 108Z`} fill={f} opacity="0.92" />
    return <g fill={f} opacity="0.9"><path d={`M84 128 Q100 134 116 128 Q116 140 100 142 Q84 140 84 128Z`} /><path d="M82 118 Q100 112 118 118 Q108 120 100 119 Q92 120 82 118Z" /></g>
  }

  // ── Expressions ─────────────────────────────────────────────────────────────
  const lip = shade(skin, -0.34)
  const mouthEl = () => {
    switch (mouth) {
      case 0: return <path d={`M84 126 Q100 138 116 126`} fill="none" stroke={lip} strokeWidth="3" strokeLinecap="round" /> // smile
      case 1: return <g><path d={`M82 124 Q100 140 118 124 Q100 130 82 124Z`} fill="#fff" /><path d={`M82 124 Q100 141 118 124`} fill="none" stroke={lip} strokeWidth="2.6" strokeLinecap="round" /></g> // grin teeth
      case 2: return <g><path d={`M86 124 Q100 148 114 124 Q100 128 86 124Z`} fill={shade(skin,-0.5)} /><path d="M88 126 Q100 130 112 126 Q100 129 88 126Z" fill="#fff" /></g> // open smile
      case 3: return <path d={`M84 128 Q98 134 114 124`} fill="none" stroke={lip} strokeWidth="3" strokeLinecap="round" /> // smirk
      default: return <path d={`M85 127 Q100 135 115 127`} fill="none" stroke={lip} strokeWidth="3" strokeLinecap="round" />
    }
  }
  const browEl = (x: number, flip = false) => {
    const t = flip ? -1 : 1
    const d = brow === 0 ? `M${x - 11} 80 Q${x} 75 ${x + 11} 80`
      : brow === 1 ? `M${x - 11} 82 Q${x} 74 ${x + 11} 79`
      : `M${x - 11} 78 Q${x} 80 ${x + 11} 78`
    return <path d={d} fill="none" stroke={dark ? shade(hair, 0.1) : hairSh} strokeWidth="3.4" strokeLinecap="round" />
  }

  return (
    <span className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} className={float ? 'av-float' : ''} style={{ display: 'block', borderRadius: '26%' }}>
        <defs>
          <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor={shade(bg0, 0.12)} /><stop offset="55%" stopColor={bg0} /><stop offset="100%" stopColor={bg1} />
          </linearGradient>
          <radialGradient id={`${uid}skin`} cx="42%" cy="36%" r="72%">
            <stop offset="0%" stopColor={skinHi} /><stop offset="62%" stopColor={skin} /><stop offset="100%" stopColor={skinSh} />
          </radialGradient>
          <linearGradient id={`${uid}hair`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor={hairHi} /><stop offset="60%" stopColor={hair} /><stop offset="100%" stopColor={hairSh} />
          </linearGradient>
          <linearGradient id={`${uid}coat`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={blazerHi} /><stop offset="100%" stopColor={blazer} />
          </linearGradient>
          <clipPath id={`${uid}clip`}><rect x="0" y="0" width="200" height="200" rx="52" /></clipPath>
        </defs>

        <g clipPath={`url(#${uid}clip)`}>
          <rect x="0" y="0" width="200" height="200" fill={`url(#${uid}bg)`} />
          {/* soft studio light + decorative depth blobs */}
          <circle cx="150" cy="34" r="60" fill="#fff" opacity="0.06" />
          <circle cx="40" cy="170" r="52" fill="#000" opacity="0.08" />
          <ellipse cx="100" cy="66" rx="70" ry="48" fill="#fff" opacity="0.07" />

          {/* shoulders / blazer + shirt + collar */}
          <path d={`M30 200 Q34 158 66 148 Q80 168 100 168 Q120 168 134 148 Q166 158 170 200Z`} fill={`url(#${uid}coat)`} />
          <path d={`M84 150 L100 176 L116 150 Q108 166 100 166 Q92 166 84 150Z`} fill={shirt} />
          <path d="M86 150 L100 164 L92 152Z M114 150 L100 164 L108 152Z" fill={shade(blazer, -0.2)} />
          <path d={`M96 150 L100 170 L104 150`} fill="none" stroke={shade(shirt, -0.15)} strokeWidth="1.5" />

          {/* neck */}
          <path d="M88 138 Q88 152 100 154 Q112 152 112 138 L112 128 L88 128Z" fill={skinSh} />

          {backHair()}

          {/* ears */}
          <circle cx="54" cy="100" r="9" fill={skin} /><circle cx="54" cy="100" r="4.5" fill={skinDeep} opacity="0.5" />
          <circle cx="146" cy="100" r="9" fill={skin} /><circle cx="146" cy="100" r="4.5" fill={skinDeep} opacity="0.5" />

          {/* head */}
          <ellipse cx={cx} cy={headY} rx={headRx} ry={headRy} fill={`url(#${uid}skin)`} />
          {/* jaw + cheek shading for form */}
          <path d={`M64 108 Q72 150 100 152 Q128 150 136 108 Q128 140 100 142 Q72 140 64 108Z`} fill={skinSh} opacity="0.35" />
          {blush && <><ellipse cx="74" cy="112" rx="9" ry="6" fill="#E8776B" opacity="0.28" /><ellipse cx="126" cy="112" rx="9" ry="6" fill="#E8776B" opacity="0.28" /></>}
          {freckles && <g fill={skinDeep} opacity="0.4"><circle cx="80" cy="104" r="1.4"/><circle cx="86" cy="108" r="1.2"/><circle cx="120" cy="104" r="1.4"/><circle cx="114" cy="108" r="1.2"/><circle cx="100" cy="110" r="1.2"/></g>}

          {/* brows */}
          {browEl(cx - eyeDx)}
          {browEl(cx + eyeDx, true)}

          {/* eyes (blink) — sclera, iris, pupil, catchlight, lids, lashes */}
          <g className="av-eyes" style={{ animationDelay: blinkDelay }}>
            {[-1, 1].map(s => {
              const ex = cx + s * eyeDx
              return (
                <g key={s}>
                  <ellipse cx={ex} cy={eyeY} rx={eyeR} ry={eyeR - 1.5} fill="#FDFBF7" />
                  <circle cx={ex + s * 0.6} cy={eyeY + 0.5} r="5.4" fill={iris} />
                  <circle cx={ex + s * 0.6} cy={eyeY + 0.5} r="2.7" fill="#141019" />
                  <circle cx={ex + s * 0.6 - 1.6} cy={eyeY - 1.6} r="1.7" fill="#fff" />
                  <path d={`M${ex - eyeR} ${eyeY - 1} Q${ex} ${eyeY - eyeR - 1} ${ex + eyeR} ${eyeY - 1}`} fill="none" stroke={skinSh} strokeWidth="1.4" opacity="0.6" />
                  <path d={`M${ex - eyeR + 1} ${eyeY + eyeR - 2.5} Q${ex} ${eyeY + eyeR + 1} ${ex + eyeR - 1} ${eyeY + eyeR - 2.5}`} fill="none" stroke={skinSh} strokeWidth="1" opacity="0.4" />
                </g>
              )
            })}
          </g>

          {/* nose */}
          <path d={`M100 100 Q95 116 92 118 Q97 122 100 121 Q103 122 108 118 Q105 116 100 100Z`} fill={skinSh} opacity="0.5" />
          <path d="M92 118 Q100 122 108 118" fill="none" stroke={skinDeep} strokeWidth="1.4" opacity="0.4" strokeLinecap="round" />

          {mouthEl()}
          {facialHair()}
          {frontHair()}

          {/* glasses */}
          {glasses >= 0 && (
            <g fill="none" stroke="#20242E" strokeWidth="2.6" opacity="0.9">
              {glasses === 0 ? <><circle cx={cx - eyeDx} cy={eyeY} r="12" /><circle cx={cx + eyeDx} cy={eyeY} r="12" /></>
                : glasses === 1 ? <><rect x={cx - eyeDx - 12} y={eyeY - 9} width="24" height="18" rx="5" /><rect x={cx + eyeDx - 12} y={eyeY - 9} width="24" height="18" rx="5" /></>
                : <><path d={`M${cx-eyeDx-12} ${eyeY-8} h24 l-4 16 h-16Z`} /><path d={`M${cx+eyeDx-12} ${eyeY-8} h24 l-4 16 h-16Z`} /></>}
              <path d={`M${cx - 8} ${eyeY - 1} h16`} />
              <path d={`M${cx - eyeDx - 12} ${eyeY - 3} l-10 -3 M${cx + eyeDx + 12} ${eyeY - 3} l10 -3`} />
            </g>
          )}

          {/* top-light rim for polish */}
          <rect x="0" y="0" width="200" height="200" rx="52" fill="url(#none)" />
          <path d="M0 0 H200 V70 Q100 40 0 70Z" fill="#fff" opacity="0.05" />
        </g>
      </svg>
      {ring && (
        <span className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-card ${live ? 'bg-teal av-presence' : 'bg-gray/45'}`}
          style={{ width: Math.max(9, size * 0.22), height: Math.max(9, size * 0.22) }} title={live ? 'Working now' : 'Idle'} />
      )}
    </span>
  )
}
