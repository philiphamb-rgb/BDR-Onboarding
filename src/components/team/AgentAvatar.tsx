// @ts-nocheck
'use client'

// A refined, professional, illustrated portrait for an AI teammate — warm studio
// backdrop, upper-body with a blazer and collar, natural features with softly
// shaded skin, and characterful variety (skin tone, hair, glasses, facial hair,
// attire) generated deterministically from the agent id. Pure inline SVG, so it
// stays crisp at any size and CSP-safe. It's alive: eyes blink, the portrait
// breathes, it tilts to greet you and WAVES on hover, and it RAISES ITS HAND when
// it's awaiting your approval (human-in-the-loop) — a live office reporting to you.

const SKIN = ['#FCE0C8', '#F6C9A2', '#EAB489', '#DBA075', '#C4885E', '#A76B45', '#875336', '#6B4126']
const HAIR = ['#241811', '#3C2618', '#583722', '#77492A', '#9C6A38', '#C29A5C', '#E1C084', '#9AA0A8', '#63676F', '#141317', '#A9472B', '#4A2E5E']
const IRIS = ['#5B3B22', '#3E2A1A', '#3C6E8F', '#4B7A5B', '#6A5140', '#2F5D6B']
const BLAZER = ['#1E2A44', '#243044', '#374151', '#4A2E3E', '#2C3E50', '#38304F', '#14403F', '#5B4632', '#6E3529', '#26324C', '#3A3F4A']
const SHIRT = ['#FBFCFE', '#EAF1FA', '#DDE9F6', '#F3ECDE', '#E7EEE9', '#F6E9EC']
// Warm studio backdrop (like a professional team page). Subtle per-agent warmth
// so the wall of portraits feels consistent but not identical.
const BG_TOP = ['#FDEBD2', '#FCE6CA', '#FBE8D6', '#FDEAD0', '#FCE4CE']
const BG_BOT = ['#F6D5AE', '#F4CFA6', '#F5D2B4', '#F6D3A9', '#F3CDAB']

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt }
  else { const a = 1 + amt; r *= a; g *= a; b *= a }
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

export function AgentAvatar({ agent, size = 44, live = false, float = false, ring = true, raiseHand = false, className = '' }: any) {
  const seed = hashStr(agent?.id || agent?.fullName || 'x')
  const b = (shift: number, mod: number) => (seed >>> shift) % mod
  const pick = (arr: any[], shift: number) => arr[(seed >>> shift) % arr.length]

  const skin = pick(SKIN, 2)
  const skinHi = shade(skin, 0.18), skinSh = shade(skin, -0.14), skinDeep = shade(skin, -0.26)
  const hair = pick(HAIR, 7), hairHi = shade(hair, 0.22), hairSh = shade(hair, -0.26)
  const iris = pick(IRIS, 11)
  const blazer = pick(BLAZER, 13), blazerHi = shade(blazer, 0.14), blazerSh = shade(blazer, -0.22)
  const shirt = pick(SHIRT, 5)
  const bgTop = pick(BG_TOP, 3), bgBot = pick(BG_BOT, 3)

  const style = b(4, 11)
  const brow = b(9, 3)
  const smile = b(14, 3)
  const glasses = b(17, 5) === 0 ? b(22, 2) : -1
  const beard = b(19, 6)
  const hasBeard = beard < 2 && style !== 4 && style !== 9 && style !== 10
  const tie = b(24, 3) === 0
  const uid = `p${seed.toString(36)}`
  const blinkDelay = `${((seed % 70) / 10).toFixed(1)}s`
  const cx = 100, eyeY = 92, eyeDx = 17

  // ── Hair (back + front) ─────────────────────────────────────────────────────
  const backHair = () => {
    if (style === 1 || style === 9) return null
    if (style === 3 || style === 6 || style === 8) return <path d="M54 90 Q48 158 68 168 L132 168 Q152 158 146 90 Q146 44 100 44 Q54 44 54 90Z" fill={hairSh} />
    if (style === 10) return <circle cx={cx} cy="86" r="56" fill={hairSh} />
    return <path d="M56 94 Q52 48 100 48 Q148 48 144 94 L144 112 Q140 90 100 90 Q60 90 56 112Z" fill={hairSh} />
  }
  const frontHair = () => {
    const fill = `url(#${uid}hair)`
    switch (style) {
      case 0: return <path d="M58 88 Q54 46 100 46 Q146 46 142 88 Q138 64 118 60 Q104 70 90 63 Q72 58 58 88Z" fill={fill} />
      case 1: return <path d="M62 84 Q60 52 100 52 Q140 52 138 84 Q138 68 100 68 Q62 68 62 84Z" fill={fill} />
      case 2: return <g fill={fill}><circle cx="72" cy="60" r="13" /><circle cx="92" cy="51" r="15" /><circle cx="110" cy="53" r="14" /><circle cx="128" cy="64" r="11" /><circle cx="62" cy="78" r="9" /></g>
      case 3: return <path d="M56 88 Q52 46 100 46 Q148 46 144 88 Q136 62 100 60 Q64 62 56 88Z" fill={fill} />
      case 4: return <g fill={fill}><ellipse cx="100" cy="38" rx="14" ry="10" /><path d="M58 86 Q54 50 100 50 Q146 50 142 86 Q136 66 100 66 Q64 66 58 86Z" /></g>
      case 5: return <path d="M64 76 Q72 58 100 58 Q122 58 132 66 Q124 52 100 52 Q72 52 64 76Z" fill={fill} opacity="0.95" />
      case 6: return <path d="M56 90 Q52 46 100 46 Q148 46 144 90 Q138 66 122 62 Q114 71 100 69 Q86 67 78 62 Q62 64 56 90Z" fill={fill} />
      case 7: return <path d="M60 86 Q56 48 100 48 Q144 48 140 86 Q138 62 118 60 Q112 70 100 68 Q80 64 82 60 Q66 60 60 86Z" fill={fill} />
      case 8: return <path d="M56 88 Q52 46 100 46 Q148 46 144 88 Q136 60 100 58 Q64 60 56 88Z" fill={fill} />
      case 9: return null
      case 10: return null
      default: return null
    }
  }
  const facial = () => {
    if (!hasBeard) return null
    const f = hairSh
    if (beard === 0) return <path d="M70 104 Q72 142 100 148 Q128 142 130 104 Q118 126 100 126 Q82 126 70 104Z" fill={f} opacity="0.9" />
    return <g fill={f} opacity="0.85"><path d="M86 122 Q100 128 114 122 Q114 132 100 134 Q86 132 86 122Z" /><path d="M84 113 Q100 108 116 113 Q108 115 100 114 Q92 115 84 113Z" /></g>
  }

  const lip = shade(skin, -0.3)
  const mouthEl = () => {
    if (smile === 0) return <path d="M88 120 Q100 130 112 120" fill="none" stroke={lip} strokeWidth="2.6" strokeLinecap="round" />
    if (smile === 1) return <g><path d="M87 118 Q100 130 113 118 Q100 123 87 118Z" fill="#fff" /><path d="M87 118 Q100 131 113 118" fill="none" stroke={lip} strokeWidth="2.2" strokeLinecap="round" /></g>
    return <path d="M89 121 Q100 127 111 120" fill="none" stroke={lip} strokeWidth="2.6" strokeLinecap="round" />
  }

  return (
    <span className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} className={float ? 'av-float' : ''} style={{ display: 'block', borderRadius: '24%' }}>
        <defs>
          <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bgTop} /><stop offset="100%" stopColor={bgBot} />
          </linearGradient>
          <radialGradient id={`${uid}skin`} cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor={skinHi} /><stop offset="64%" stopColor={skin} /><stop offset="100%" stopColor={skinSh} />
          </radialGradient>
          <linearGradient id={`${uid}hair`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor={hairHi} /><stop offset="60%" stopColor={hair} /><stop offset="100%" stopColor={hairSh} />
          </linearGradient>
          <linearGradient id={`${uid}coat`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={blazerHi} /><stop offset="100%" stopColor={blazerSh} />
          </linearGradient>
          <clipPath id={`${uid}clip`}><rect x="0" y="0" width="200" height="200" rx="48" /></clipPath>
        </defs>

        <g clipPath={`url(#${uid}clip)`}>
          <rect x="0" y="0" width="200" height="200" fill={`url(#${uid}bg)`} />
          <ellipse cx="100" cy="60" rx="78" ry="52" fill="#fff" opacity="0.18" />
          <ellipse cx="100" cy="205" rx="66" ry="40" fill="#000" opacity="0.04" />

          <g className="av-greet">
            {/* shoulders / blazer + shirt + collar + optional tie */}
            <path d="M22 200 Q26 152 64 140 Q82 160 100 160 Q118 160 136 140 Q174 152 178 200Z" fill={`url(#${uid}coat)`} />
            <path d="M78 146 L100 178 L122 146 Q112 162 100 162 Q88 162 78 146Z" fill={shirt} />
            <path d="M82 146 L100 168 L92 150Z M118 146 L100 168 L108 150Z" fill={blazerSh} />
            {tie
              ? <path d="M100 152 l6 8 -6 26 -6 -26Z" fill={shade(blazer, -0.05) === blazer ? '#7A2E3A' : '#7A2E3A'} />
              : <path d="M96 150 L100 176 L104 150" fill="none" stroke={shade(shirt, -0.12)} strokeWidth="1.4" />}
            <path d="M64 140 Q78 150 82 150 M136 140 Q122 150 118 150" fill="none" stroke={blazerHi} strokeWidth="2" opacity="0.5" />
            {/* lapel pin */}
            <circle cx="84" cy="156" r="1.8" fill={blazerHi} opacity="0.8" />

            {/* neck */}
            <path d="M90 132 Q90 148 100 150 Q110 148 110 132 L110 122 L90 122Z" fill={skinSh} />

            {backHair()}

            {/* ears */}
            <circle cx="58" cy="94" r="8" fill={skin} /><circle cx="58" cy="94" r="4" fill={skinDeep} opacity="0.5" />
            <circle cx="142" cy="94" r="8" fill={skin} /><circle cx="142" cy="94" r="4" fill={skinDeep} opacity="0.5" />

            {/* head */}
            <ellipse cx={cx} cy="90" rx="42" ry="47" fill={`url(#${uid}skin)`} />
            <path d="M66 100 Q74 142 100 144 Q126 142 134 100 Q126 132 100 134 Q74 132 66 100Z" fill={skinSh} opacity="0.3" />
            <ellipse cx="76" cy="106" rx="7" ry="5" fill="#E8776B" opacity="0.16" />
            <ellipse cx="124" cy="106" rx="7" ry="5" fill="#E8776B" opacity="0.16" />

            {/* brows */}
            {[-1, 1].map(s => {
              const x = cx + s * eyeDx
              const d = brow === 0 ? `M${x - 9} 77 Q${x} 73 ${x + 9} 77` : brow === 1 ? `M${x - 9} 79 Q${x} 72 ${x + 9} 76` : `M${x - 9} 75 Q${x} 77 ${x + 9} 75`
              return <path key={s} d={d} fill="none" stroke={shade(hair, 0.05)} strokeWidth="3" strokeLinecap="round" />
            })}

            {/* eyes */}
            <g className="av-eyes" style={{ animationDelay: blinkDelay }}>
              {[-1, 1].map(s => {
                const ex = cx + s * eyeDx
                return (
                  <g key={s}>
                    <ellipse cx={ex} cy={eyeY} rx="7.5" ry="6" fill="#FDFBF7" />
                    <circle cx={ex + s * 0.5} cy={eyeY + 0.4} r="4.4" fill={iris} />
                    <circle cx={ex + s * 0.5} cy={eyeY + 0.4} r="2.2" fill="#14100f" />
                    <circle cx={ex + s * 0.5 - 1.4} cy={eyeY - 1.4} r="1.5" fill="#fff" />
                    <path d={`M${ex - 7.5} ${eyeY - 1} Q${ex} ${eyeY - 7.5} ${ex + 7.5} ${eyeY - 1}`} fill="none" stroke={skinSh} strokeWidth="1.3" opacity="0.55" />
                  </g>
                )
              })}
            </g>

            {/* nose */}
            <path d="M100 94 Q96 108 93 110 Q97 113 100 112 Q103 113 107 110 Q104 108 100 94Z" fill={skinSh} opacity="0.45" />
            <path d="M93 110 Q100 113 107 110" fill="none" stroke={skinDeep} strokeWidth="1.2" opacity="0.35" strokeLinecap="round" />

            {mouthEl()}
            {facial()}
            {frontHair()}

            {glasses >= 0 && (
              <g fill="none" stroke="#20242E" strokeWidth="2.2" opacity="0.88">
                {glasses === 0
                  ? <><circle cx={cx - eyeDx} cy={eyeY} r="10" /><circle cx={cx + eyeDx} cy={eyeY} r="10" /></>
                  : <><rect x={cx - eyeDx - 10} y={eyeY - 8} width="20" height="16" rx="4" /><rect x={cx + eyeDx - 10} y={eyeY - 8} width="20" height="16" rx="4" /></>}
                <path d={`M${cx - 7} ${eyeY - 1} h14`} />
                <path d={`M${cx - eyeDx - 10} ${eyeY - 2} l-8 -2 M${cx + eyeDx + 10} ${eyeY - 2} l8 -2`} />
              </g>
            )}
          </g>

          {/* waving / raised hand — greets on hover, raised when awaiting approval */}
          <g className={`av-hand${raiseHand ? ' is-raised' : ''}`}>
            <rect x="150" y="96" width="13" height="30" rx="6" fill={`url(#${uid}coat)`} />
            <circle cx="156.5" cy="80" r="12" fill={skin} />
            <g fill={skin}>
              <rect x="149" y="66" width="4" height="16" rx="2" /><rect x="154" y="63" width="4" height="18" rx="2" />
              <rect x="159" y="64" width="4" height="17" rx="2" /><rect x="164" y="67" width="4" height="14" rx="2" />
            </g>
            <ellipse cx="147" cy="82" rx="4" ry="3" fill={skin} transform="rotate(-30 147 82)" />
          </g>
        </g>
      </svg>

      {ring && (
        <span className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-card ${live ? 'bg-teal av-presence' : 'bg-gray/45'}`}
          style={{ width: Math.max(9, size * 0.22), height: Math.max(9, size * 0.22) }} title={live ? 'Working now' : 'Idle'} />
      )}
    </span>
  )
}
