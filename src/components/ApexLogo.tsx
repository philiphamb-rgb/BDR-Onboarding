// Apex — the brand mark. A sleek F1 car in profile inside a gradient speed
// badge, drawn as inline SVG so it's pixel-perfect at any resolution / DPI (no
// raster asset to go blurry on retina). Used in the sidebar header and can be
// dropped anywhere the brand appears.

export function ApexMark({ size = 40 }: { size?: number }) {
  const id = 'apexgrad'
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#003087" />
          <stop offset="0.55" stopColor="#0A2E7A" />
          <stop offset="1" stopColor="#00243E" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="6" y1="20" x2="40" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DCEBFF" />
        </linearGradient>
      </defs>
      {/* speed badge */}
      <rect width="44" height="44" rx="11" fill={`url(#${id})`} />
      {/* motion streaks */}
      <g stroke="#00C2B2" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
        <line x1="3" y1="18.5" x2="9" y2="18.5" />
        <line x1="2.5" y1="22.5" x2="10" y2="22.5" />
        <line x1="3.5" y1="26.5" x2="8.5" y2="26.5" />
      </g>
      {/* F1 car — profile silhouette */}
      <g>
        {/* rear wing */}
        <rect x="6.4" y="18.6" width="2.4" height="7.6" rx="1" fill="#F5A623" />
        <rect x="4.6" y="18.4" width="6" height="2" rx="1" fill="#F5A623" />
        {/* body wedge with cockpit bump */}
        <path d="M9 27.4 L11.6 24.8 C13.4 23.9 16 23.6 19 23.7 L22.4 20.6 C24.4 19.4 28 19 32.4 19.2 L37 19.6 L39.6 22.6 L40.2 26.4 L37.6 27.6 L11 27.6 Z" fill={`url(#${id}-b)`} />
        {/* cockpit halo */}
        <path d="M21.2 23.4 C22.4 21.4 26 21.2 27.6 23.2" stroke="#003087" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {/* accent stripe */}
        <path d="M13 26.2 L34 26.2" stroke="#00C2B2" strokeWidth="1.4" strokeLinecap="round" />
        {/* front wing */}
        <rect x="37" y="26.8" width="6.4" height="2.2" rx="1.1" fill={`url(#${id}-b)`} />
        {/* wheels */}
        <circle cx="14.4" cy="29.6" r="4.6" fill="#0F172A" />
        <circle cx="14.4" cy="29.6" r="1.8" fill="#FFFFFF" />
        <circle cx="33.6" cy="29.6" r="4.6" fill="#0F172A" />
        <circle cx="33.6" cy="29.6" r="1.8" fill="#FFFFFF" />
      </g>
    </svg>
  )
}

// Full lockup: the mark + the APEX wordmark. `variant` picks light/dark text.
export function ApexLogo({ size = 40, subtitle = 'RACE-GRADE SALES OS' }: { size?: number; subtitle?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <ApexMark size={size} />
      <span className="leading-none">
        <span className="block text-[19px] font-[900] italic tracking-[-0.02em] text-navy">APEX</span>
        <span className="mt-1 block text-[9px] font-[800] uppercase tracking-[0.18em] text-gray">{subtitle}</span>
      </span>
    </span>
  )
}
