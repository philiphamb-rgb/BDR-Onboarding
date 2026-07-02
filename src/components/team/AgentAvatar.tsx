// @ts-nocheck
'use client'

// Procedural "headshot" for an AI teammate — a distinct, characterful portrait
// generated deterministically from the agent id, so every agent looks like a
// specific person (different skin tone, hair, glasses, facial hair, outfit) and
// the roster reads like a real office. Pure inline SVG (CSP-safe — no external
// images), with a subtle blink + breathing so the office feels alive, and a
// live-presence ring when the agent is working. Same id → same face, forever.

const SKIN = ['#F8D9C0', '#F1C9A5', '#E7B891', '#D19E78', '#B87D57', '#9A6540', '#7A4E30']
const HAIR = ['#1B1712', '#3A2A1E', '#5B3D27', '#7A5230', '#A9793F', '#C9A35B', '#8E8E96', '#5A5A64', '#0E0F13']
const OUTFIT = ['#1E2A44', '#0F5C57', '#374151', '#5B2A45', '#2C3E50', '#3A2E5C', '#144E52', '#455568', '#7A3B2E']

// Department-tinted background gradients so avatars stay cohesive by team.
const DEPT_BG: Record<string, [string, string]> = {
  exec: ['#2A3A63', '#16213B'], marketing: ['#5B3A7A', '#33204B'],
  funnel: ['#1C6E8C', '#123E52'], partner: ['#1F7A57', '#12492F'],
  compliance: ['#9A4B33', '#5E2A1C'], ops: ['#3E4A5C', '#242C38'],
  memory: ['#3B4499', '#22285C'], default: ['#2C3A5A', '#1A2338'],
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// Relative luminance of a #rrggbb color, so facial features can pick a contrast
// color that stays visible on any skin tone (dark features on light skin, light
// features on dark skin) — no avatar ever reads as a faceless silhouette.
function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function AgentAvatar({ agent, size = 44, live = false, float = false, ring = true, className = '' }: any) {
  const seed = hashStr(agent?.id || agent?.fullName || 'x')
  const pick = (arr: any[], shift: number) => arr[(seed >>> shift) % arr.length]
  const skin = pick(SKIN, 2)
  const hair = pick(HAIR, 7)
  const outfit = pick(OUTFIT, 12)
  const style = (seed >>> 4) % 8            // hairstyle
  const glasses = ((seed >>> 17) & 3) === 0 // ~25%
  const beard = ((seed >>> 19) & 7) < 2 && style !== 4 && style !== 7   // ~25%, not with buns/afros
  const dept = agent?.role?.department || 'default'
  const [g0, g1] = DEPT_BG[dept] || DEPT_BG.default
  const uid = `av${seed.toString(36)}`
  const blinkDelay = `${((seed % 60) / 10).toFixed(1)}s`
  const eyeY = 46, browY = 39
  // Contrast-aware feature colors so darker skin tones never lose their face.
  const dark = lum(skin) < 0.5
  const featureLine = dark ? '#FBEFE6' : '#5A3B34'   // nose/mouth
  const pupil = dark ? '#14181F' : '#20242E'

  // Hair renders in two layers: a back mass (behind the head) and a front/top.
  const backHair = () => {
    if (style === 1) return null                                   // buzz — no back mass
    if (style === 3 || style === 6) return <path d="M22 44 Q20 78 30 84 L70 84 Q80 78 78 44 Q78 20 50 20 Q22 20 22 44Z" fill={hair} />  // long
    if (style === 7) return <circle cx="50" cy="40" r="30" fill={hair} />  // afro halo
    return <path d="M26 40 Q26 22 50 22 Q74 22 74 40 L74 54 Q74 40 50 40 Q26 40 26 54Z" fill={hair} />
  }
  const frontHair = () => {
    switch (style) {
      case 0: return <path d="M28 42 Q28 22 50 22 Q72 22 72 42 Q66 30 50 30 Q40 30 34 34 Q30 37 28 42Z" fill={hair} />        // side part
      case 1: return <path d="M30 40 Q30 24 50 24 Q70 24 70 40 Q70 33 50 33 Q30 33 30 40Z" fill={hair} opacity="0.95" />       // buzz
      case 2: return <g fill={hair}><circle cx="34" cy="32" r="8"/><circle cx="46" cy="28" r="9"/><circle cx="58" cy="29" r="9"/><circle cx="68" cy="34" r="7"/><circle cx="30" cy="40" r="6"/></g>  // curly
      case 3: return <path d="M28 40 Q28 20 50 20 Q72 20 72 40 Q64 28 50 28 Q36 28 28 40Z" fill={hair} />                       // long+fringe
      case 4: return <g fill={hair}><circle cx="50" cy="18" r="8"/><path d="M28 40 Q28 22 50 22 Q72 22 72 40 Q64 30 50 30 Q36 30 28 40Z"/></g>  // bun
      case 5: return <path d="M30 38 Q34 30 50 30 Q60 30 66 34 Q60 26 50 26 Q36 26 30 38Z" fill={hair} opacity="0.9" />          // receding
      case 6: return <path d="M27 42 Q27 22 50 22 Q73 22 73 42 Q70 30 60 30 Q56 34 50 33 Q44 32 40 30 Q32 30 27 42Z" fill={hair} />  // wavy
      case 7: return null                                                                                                         // afro (back only)
      default: return null
    }
  }
  const facial = () => {
    if (!beard) return null
    return <path d="M33 52 Q34 68 50 70 Q66 68 67 52 Q60 60 50 60 Q40 60 33 52Z" fill={hair} opacity="0.9" />
  }

  return (
    <span className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className={float ? 'av-float' : ''} style={{ display: 'block', borderRadius: '28%' }}>
        <defs>
          <radialGradient id={`${uid}bg`} cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor={g0} />
            <stop offset="100%" stopColor={g1} />
          </radialGradient>
          <clipPath id={`${uid}clip`}><rect x="0" y="0" width="100" height="100" rx="28" /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}clip)`}>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}bg)`} />
          {/* shoulders / outfit */}
          <path d="M18 100 Q20 78 34 72 Q42 80 50 80 Q58 80 66 72 Q80 78 82 100Z" fill={outfit} />
          <path d="M44 74 L56 74 L54 82 Q50 85 46 82Z" fill={skin} opacity="0.9" />
          {/* soft spotlight so the head separates from the background */}
          <ellipse cx="50" cy="47" rx="27" ry="30" fill="#FFFFFF" opacity="0.14" />
          {/* back hair */}
          {backHair()}
          {/* ears */}
          <circle cx="27" cy={eyeY + 2} r="5" fill={skin} />
          <circle cx="73" cy={eyeY + 2} r="5" fill={skin} />
          {/* head */}
          <ellipse cx="50" cy="46" rx="21" ry="24" fill={skin} stroke="#000" strokeOpacity="0.10" strokeWidth="0.75" />
          {/* soft cheek shading */}
          <ellipse cx="50" cy="52" rx="21" ry="18" fill="#000" opacity="0.04" />
          {/* brows — darker than skin so they read on any tone */}
          <rect x="37" y={browY} width="10" height="2.4" rx="1.2" fill={dark ? '#2A211B' : hair} opacity="0.9" />
          <rect x="53" y={browY} width="10" height="2.4" rx="1.2" fill={dark ? '#2A211B' : hair} opacity="0.9" />
          {/* eyes (blink) — white sclera + pupil so they never vanish */}
          <g className="av-eyes" style={{ animationDelay: blinkDelay }}>
            <ellipse cx="42" cy={eyeY} rx="3.4" ry="2.8" fill="#FBF7F2" />
            <ellipse cx="58" cy={eyeY} rx="3.4" ry="2.8" fill="#FBF7F2" />
            <circle cx="42.4" cy={eyeY} r="1.7" fill={pupil} />
            <circle cx="57.6" cy={eyeY} r="1.7" fill={pupil} />
            <circle cx="43" cy={eyeY - 0.6} r="0.6" fill="#fff" />
            <circle cx="58.2" cy={eyeY - 0.6} r="0.6" fill="#fff" />
          </g>
          {/* nose + mouth — contrast-aware */}
          <path d="M50 49 L48 55 Q50 56.5 52 55" fill="none" stroke={featureLine} strokeOpacity="0.5" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M44 60 Q50 63.5 56 60" fill="none" stroke={featureLine} strokeOpacity="0.85" strokeWidth="1.8" strokeLinecap="round" />
          {/* facial hair */}
          {facial()}
          {/* front hair */}
          {frontHair()}
          {/* glasses */}
          {glasses && (
            <g fill="none" stroke="#2B2F3A" strokeWidth="1.6" opacity="0.85">
              <rect x="35" y={eyeY - 4} width="12" height="9" rx="4.5" />
              <rect x="53" y={eyeY - 4} width="12" height="9" rx="4.5" />
              <path d={`M47 ${eyeY} L53 ${eyeY}`} />
            </g>
          )}
        </g>
      </svg>
      {/* live presence dot */}
      {ring && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card ${live ? 'bg-teal av-presence' : 'bg-gray/50'}`}
          title={live ? 'Working now' : 'Idle'}
        />
      )}
    </span>
  )
}
