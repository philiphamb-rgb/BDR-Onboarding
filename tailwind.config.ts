import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── Brand Colors ──────────────────────────────────────────────────────
      colors: {
        // Primary palette — brand primary is themeable (red) via CSS channels
        navy: {
          DEFAULT: 'rgb(var(--navy) / <alpha-value>)',
          dark:    'rgb(var(--navy-dark) / <alpha-value>)',
          mid:     'rgb(var(--navy-mid) / <alpha-value>)',
        },
        // Supporting accents — themeable via the accent scheme (brand vs custom)
        teal: {
          DEFAULT: 'rgb(var(--teal) / <alpha-value>)',
          dark:    'rgb(var(--teal-dark) / <alpha-value>)',
        },
        mint:    '#00C97A',
        gold:    'rgb(var(--gold) / <alpha-value>)',
        plum:    'rgb(var(--plum) / <alpha-value>)',
        // UI colors — themeable (dark default / light option)
        bdrbg:   'rgb(var(--bg) / <alpha-value>)',
        card:    'rgb(var(--card) / <alpha-value>)',
        border:  'rgb(var(--border) / <alpha-value>)',
        light:   'rgb(var(--light) / <alpha-value>)',
        // Text — themeable
        'dark-text': 'rgb(var(--text) / <alpha-value>)',
        'mid-text':  'rgb(var(--text-mid) / <alpha-value>)',
        gray:        'rgb(var(--text-muted) / <alpha-value>)',
        // Status
        success: '#16A34A',
        error:   'rgb(var(--error) / <alpha-value>)',
        blue:    '#1D4ED8',
        purple:  '#6D28D9',
        // Belt colors
        belt: {
          white:  '#9CA3AF',
          yellow: '#CA8A04',
          orange: '#C2410C',
          green:  '#059669',
          blue:   '#1D4ED8',
          purple: '#6D28D9',
          black:  '#111827',
        },
      },

      // ─── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'h1': ['28px', { lineHeight: '1.2', fontWeight: '900' }],
        'h2': ['22px', { lineHeight: '1.3', fontWeight: '800' }],
        'h3': ['18px', { lineHeight: '1.4', fontWeight: '700' }],
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '500' }],
        'body':    ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'small':   ['12px', { lineHeight: '1.4', fontWeight: '600' }],
        'label':   ['11px', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '0.07em' }],
      },

      // ─── Spacing (4px grid) ────────────────────────────────────────────────
      spacing: {
        'xs':  '4px',
        'sm':  '8px',
        'md':  '12px',
        'lg':  '16px',
        'xl':  '24px',
        '2xl': '32px',
        '3xl': '48px',
      },

      // ─── Border Radius ─────────────────────────────────────────────────────
      borderRadius: {
        'sm':  '8px',
        'md':  '12px',
        'lg':  '16px',
        'xl':  '20px',
        'pill': '100px',
      },

      // ─── Box Shadows ───────────────────────────────────────────────────────
      boxShadow: {
        'card':   '0 2px 8px rgba(0,0,0,0.06)',
        'modal':  '0 8px 32px rgba(0,0,0,0.12)',
        'button': '0 4px 16px rgba(59,98,153,0.28)',
        'none':   'none',
      },

      // ─── Background Gradients ──────────────────────────────────────────────
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, rgb(var(--teal)), rgb(var(--teal-dark)))',
        'gradient-hero':    'linear-gradient(135deg, rgb(var(--navy-dark)), rgb(var(--navy)))',
        'gradient-gold':    'linear-gradient(135deg, rgb(var(--gold)), #FFB300)',
        'gradient-belt':    'linear-gradient(90deg, rgb(var(--teal)), #00C97A)',
        'gradient-purple':  'linear-gradient(135deg, #6D28D9, #4C1D95)',
      },

      // ─── Animations ────────────────────────────────────────────────────────
      transitionDuration: {
        'micro':       '150ms',
        'standard':    '250ms',
        'celebration': '500ms',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop': {
          '0%':   { transform: 'scale(0.85)' },
          '60%':  { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'xp-float': {
          '0%':   { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-40px)' },
        },
        'checkmark-draw': {
          '0%':   { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-teal': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,194,178,0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(0,194,178,0)' },
        },
        'toast-in': {
          '0%':   { opacity: '0', transform: 'translateY(-8px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'toast-out': {
          '0%':   { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-8px) scale(0.95)' },
        },
        'toast-countdown': {
          '0%':   { transform: 'scaleX(1)' },
          '100%': { transform: 'scaleX(0)' },
        },
      },
      animation: {
        'fade-up':      'fade-up 250ms ease-out both',
        'fade-in':      'fade-in 200ms ease-out both',
        'pop':          'pop 300ms ease-out both',
        'slide-up':     'slide-up 300ms ease-out both',
        'slide-in':     'slide-in 300ms ease-out both',
        'xp-float':     'xp-float 1200ms ease-out forwards',
        'shimmer':      'shimmer 1.5s infinite linear',
        'pulse-teal':   'pulse-teal 2s infinite',
        'toast-in':     'toast-in 200ms ease-out both',
        'toast-out':    'toast-out 180ms ease-in both',
      },

      // ─── Screen breakpoints ────────────────────────────────────────────────
      screens: {
        'mobile':  '0px',
        'tablet':  '641px',
        'desktop': '1025px',
      },

      // ─── Z-index scale ─────────────────────────────────────────────────────
      zIndex: {
        'nav':     '100',
        'sidebar': '200',
        'toast':   '300',
        'modal':   '400',
        'overlay': '500',
      },
    },
  },
  plugins: [],
}

export default config
