import { BottomNav, Sidebar } from '@/components/nav'

export const dynamic = 'force-dynamic'
import { OfflineBanner } from '@/lib/hooks/OfflineBanner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bdrbg">
      <OfflineBanner />
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 desktop:ml-60 pb-safe pb-20 desktop:pb-0 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-6 desktop:px-8 desktop:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
