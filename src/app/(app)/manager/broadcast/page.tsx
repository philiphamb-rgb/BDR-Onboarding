// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Badge } from '@/components/ui'
import { BellIcon, TeamIcon } from '@/components/icons'
import { cn, formatRelativeTime } from '@/lib/utils'
import { toast } from '@/components/ui'

interface Broadcast {
  id: string
  title: string
  body: string
  created_at: string
  recipient_count: number
}

export default function BroadcastPage() {
  const supabase = createClient()
  const [teamId, setTeamId] = useState<string>()
  const [managerId, setManagerId] = useState<string>()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [teamSize, setTeamSize] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setManagerId(user.id)
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (data?.team_id) {
          setTeamId(data.team_id)
          loadTeamInfo(data.team_id)
          loadBroadcasts(user.id)
        }
      })
    })
  }, [])

  const loadTeamInfo = async (tid: string) => {
    const { data } = await supabase.from('users').select('id').eq('team_id', tid).eq('role', 'rep')
    setTeamSize(data?.length ?? 0)
  }

  const loadBroadcasts = async (uid: string) => {
    // Load recent broadcasts from notifications sent by this manager
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, created_at')
      .eq('type', 'broadcast')
      .order('created_at', { ascending: false })
      .limit(10)
    setBroadcasts((data ?? []).map(n => ({ ...n, recipient_count: 0 })))
  }

  const sendBroadcast = async () => {
    if (!title.trim() || !body.trim() || !teamId) return
    setSending(true)

    try {
      // Get all team reps
      const { data: reps } = await supabase
        .from('users')
        .select('id')
        .eq('team_id', teamId)
        .eq('role', 'rep')

      if (!reps || reps.length === 0) {
        toast.error('No team members to send to')
        return
      }

      // Create notifications for all reps
      const notifications = reps.map(rep => ({
        user_id: rep.id,
        type: 'broadcast',
        title: title.trim(),
        body: body.trim(),
        tier: 2,
      }))

      const { error } = await supabase.from('notifications').insert(notifications)

      if (error) throw error

      toast.success(`Message sent to ${reps.length} team members`)
      setBroadcasts(prev => [{
        id: Date.now().toString(),
        title: title.trim(),
        body: body.trim(),
        created_at: new Date().toISOString(),
        recipient_count: reps.length,
      }, ...prev])
      setTitle('')
      setBody('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const charsLeft = 200 - body.length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 text-gray-900">Broadcast</h1>
        <p className="text-sm text-gray-500">Send a message to your entire team</p>
      </div>

      {/* Compose */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-navy/10 rounded-full flex items-center justify-center">
            <TeamIcon className="w-4 h-4 text-navy" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">All team members</div>
            <div className="text-xs text-gray-500">{teamSize} reps will receive this</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-label text-gray-700 mb-1 block">Subject</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Announcement, challenge update, motivation..."
              className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-label text-gray-700 mb-1 block">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value.slice(0, 200))}
              placeholder="Write your message here..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none"
            />
            <div className={cn('text-xs text-right mt-1', charsLeft < 20 ? 'text-red-500' : 'text-gray-400')}>
              {charsLeft} characters left
            </div>
          </div>
          <Button
            onClick={sendBroadcast}
            loading={sending}
            disabled={!title.trim() || !body.trim()}
            className="w-full"
            size="lg"
          >
            <BellIcon className="mr-2 w-4 h-4" />
            Send to All ({teamSize})
          </Button>
        </div>
      </Card>

      {/* Recent broadcasts */}
      {broadcasts.length > 0 && (
        <Card>
          <h2 className="text-h3 text-gray-900 mb-3">Recent Messages</h2>
          <div className="space-y-3">
            {broadcasts.map(b => (
              <div key={b.id} className="p-3 bg-gray-50 rounded-xl border border-border">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{b.title}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{formatRelativeTime(b.created_at)}</span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{b.body}</p>
                {b.recipient_count > 0 && (
                  <div className="text-xs text-gray-400 mt-1">Sent to {b.recipient_count} reps</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
