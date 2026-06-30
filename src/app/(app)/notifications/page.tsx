// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, SkeletonList } from '@/components/ui'
import { BellIcon, BeltIcon, TrophyIcon, ClockIcon, TargetIcon, SuccessIcon, BookIcon, FlameIcon } from '@/components/icons'
import { cn, formatRelativeTime } from '@/lib/utils'

interface NotifRow { id: string; type: string; title: string; body: string; is_read: boolean; created_at: string }

const TYPE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  belt_advance: BeltIcon, achievement: TrophyIcon, reminder: ClockIcon, coaching: TargetIcon,
  win: SuccessIcon, system: BellIcon, resource: BookIcon, streak: FlameIcon,
}
const TYPE_TINT: Record<string, string> = {
  belt_advance: 'text-navy', achievement: 'text-gold', reminder: 'text-gray', coaching: 'text-teal',
  win: 'text-teal', system: 'text-gray', resource: 'text-navy', streak: 'text-orange-500',
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [notifs, setNotifs] = useState<NotifRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('notifications').select('id, type, title, body, is_read, created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
        .then(({ data }) => {
          setNotifs(data ?? [])
          setLoading(false)
          // Mark all as read
          supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false).then(() => {})
        })
    })
  }, [])

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-dark-text">Notifications</h1>
        {notifs.filter(n => !n.is_read).length > 0 && (
          <span className="text-xs text-gray">{notifs.filter(n => !n.is_read).length} unread</span>
        )}
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : notifs.length === 0 ? (
        <div className="text-center py-12">
          <BellIcon className="w-12 h-12 text-border mx-auto mb-3" />
          <p className="text-gray">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <Card key={n.id} className={cn('!p-3 transition-colors', !n.is_read && 'border-navy/20 bg-navy/5')}>
              <div className="flex items-start gap-3">
                {(() => { const Ic = TYPE_ICON[n.type] ?? BellIcon; return <Ic size={20} className={cn('flex-shrink-0 mt-0.5', TYPE_TINT[n.type] ?? 'text-gray')} /> })()}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', !n.is_read ? 'font-semibold text-dark-text' : 'font-medium text-mid-text')}>{n.title}</p>
                  {n.body && <p className="text-xs text-gray mt-0.5">{n.body}</p>}
                  <p className="text-xs text-gray mt-0.5">{formatRelativeTime(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-teal rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
