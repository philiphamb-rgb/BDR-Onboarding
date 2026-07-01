'use client'

// Catches errors thrown in the root layout itself. It must render its own
// <html>/<body>, so it uses inline styles (Tailwind/layout aren't guaranteed
// to be available at this level).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#F0F5FA', color: '#0D1B2A' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#64748B', maxWidth: 360, margin: '0 0 24px' }}>
            The app hit an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            style={{ height: 50, padding: '0 24px', borderRadius: 100, border: 'none', background: 'linear-gradient(135deg,rgb(var(--teal)),#009E8B)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
