// @ts-nocheck
import { BottomNav, Sidebar, AppHeader } from '@/components/nav'
import { BeltWatcher } from '@/components/gamification'
import { MilestoneWatcher } from '@/components/MilestoneWatcher'
import { CoachDock } from '@/components/CoachDock'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { OfflineBanner } from '@/lib/hooks/OfflineBanner'
import { UpdateBanner } from '@/components/UpdateBanner'
import { GuidedTour } from '@/components/GuidedTour'
import { ThemeSync } from '@/components/ThemeSync'
import { PageTransition } from '@/components/PageTransition'
import { CommandPalette } from '@/components/CommandPalette'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let user = null
  let unreadCount = 0

  if (authUser) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, role, avatar_url, theme, accent_color')
        .eq('id', authUser.id)
        .single(),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('is_read', false),
    ])
    user = profile ?? null
    unreadCount = count ?? 0
  }

  return (
    <div className="flex min-h-screen bg-bdrbg">
      <ThemeSync base={user?.theme} accent={user?.accent_color} />
      <OfflineBanner />
      <UpdateBanner />

      {/* Desktop side navigation (back-office style) */}
      <Sidebar user={user} unreadCount={unreadCount} />

      {/* Main content */}
      <main className="flex-1 desktop:ml-[var(--sb-w)] min-h-screen pb-[calc(72px+env(safe-area-inset-bottom))] desktop:pb-0 transition-[margin] duration-300">
        {/* Global header — search + profile + settings + notifications, every page */}
        <AppHeader user={user} unreadCount={unreadCount} />
        <div className="max-w-3xl mx-auto px-4 py-5 desktop:max-w-5xl desktop:px-10 desktop:py-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav user={user} unreadCount={unreadCount} />

      {/* Fires a confetti celebration on a genuine belt advance */}
      <BeltWatcher userId={user?.id} />

      {/* Celebrates newly-unlocked achievement milestones */}
      <MilestoneWatcher userId={user?.id} />

      {/* The AI Coach in your pocket — reachable from every screen */}
      <CoachDock />

      {/* ⌘K command palette + global hotkeys + quick-add */}
      <CommandPalette />

      {/* Registers the push-only service worker (Web Push + PWA) */}
      <ServiceWorkerRegister />

      {/* Live, cross-screen "What's new" walkthrough — auto-runs once per release,
          replayable from the notifications bell */}
      <GuidedTour />
    </div>
  )
}
