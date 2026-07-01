// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, toast } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { BellIcon, TeamIcon } from '@/components/icons'
import { cn, formatRelativeTime } from '@/lib/utils'

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
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [teamSize, setTeamSize] = useState(0)
  const userId = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      userId.current = user.id
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (data?.team_id) {
          setTeamId(data.team_id)
          loadTeamInfo(data.team_id)
          loadBroadcasts()
        }
      })
    })
  }, [])

  const loadTeamInfo = async (tid: string) => {
    const { data } = await supabase.from('users').select('id').eq('team_id', tid).eq('role', 'rep')
    setTeamSize(data?.length ?? 0)
  }

  const loadBroadcasts = async () => {
    const { data } = await supabase
      .from('broadcasts')
      .select('id, title, body, created_at, recipient_count')
      .order('created_at', { ascending: false })
      .limit(10)
    setBroadcasts(data ?? [])
  }

  const sendBroadcast = async () => {
    if (!title.trim() || !body.trim() || !teamId) return
    setSending(true)
    try {
      // Re-fetch the roster at send time — the list may have changed since the
      // page loaded, and the fan-out insert is atomic: one row that fails the
      // managers_broadcast_to_team WITH CHECK (e.g. a rep who left the team)
      // would otherwise reject the entire broadcast.
      const { data: reps } = await supabase.from('users').select('id').eq('team_id', teamId).eq('role', 'rep')
      if (!reps || reps.length === 0) {
        toast.error('No team members to send to')
        return
      }
      const notifications = reps.map(rep => ({
        user_id: rep.id, type: 'broadcast', title: title.trim(), body: body.trim(), tier: 2,
      }))
      const { data: inserted, error } = await supabase.from('notifications').insert(notifications).select('id')
      if (error) throw error
      const delivered = inserted?.length ?? reps.length
      // Record the broadcast in team-scoped history so it survives a reload and
      // shows an accurate recipient count. History failure is non-fatal — the
      // message was already delivered.
      const { data: rec } = await supabase
        .from('broadcasts')
        .insert({ team_id: teamId, sender_id: userId.current, title: title.trim(), body: body.trim(), recipient_count: delivered })
        .select('id, title, body, created_at, recipient_count')
        .single()
      toast.success(`Message sent to ${delivered} team member${delivered === 1 ? '' : 's'}`)
      setBroadcasts(prev => [rec ?? {
        id: Date.now().toString(), title: title.trim(), body: body.trim(),
        created_at: new Date().toISOString(), recipient_count: delivered,
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
  const canSend = title.trim() && body.trim() && teamSize > 0

  return (
    <div className="space-y-4 pb-4 stagger-rise">
      <PageHeader title="Broadcast" subtitle="Send an announcement to every rep on your team at once." />

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy/10">
            <TeamIcon size={16} className="text-navy-ink" />
          </div>
          <div>
            <div className="text-[14px] font-[600] text-dark-text">All team members</div>
            <div className="text-[12px] text-gray">{teamSize} rep{teamSize === 1 ? '' : 's'} will receive this</div>
          </div>
        </div>

        {teamSize === 0 && (
          <div className="mb-4 rounded-md border border-gold/40 bg-gold/[0.06] px-3 py-2 text-[12px] font-[600] text-[#A06C00]">
            You have no reps yet. Invite your team before sending a broadcast.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="label mb-1 block">Subject</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Announcement, challenge update, motivation…"
              className="w-full rounded-md border border-border px-4 py-3 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-navy"
              maxLength={100}
            />
          </div>
          <div>
            <label className="label mb-1 block">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value.slice(0, 200))}
              placeholder="Write your message here…"
              rows={4}
              className="w-full resize-none rounded-md border border-border px-4 py-3 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-navy"
            />
            <div className={cn('mt-1 text-right text-[12px]', charsLeft < 20 ? 'text-error' : 'text-gray')}>
              {charsLeft} characters left
            </div>
          </div>
          <Button onClick={sendBroadcast} loading={sending} disabled={!canSend} fullWidth size="lg" icon={<BellIcon size={16} />}>
            Send to All ({teamSize})
          </Button>
        </div>
      </Card>

      {broadcasts.length > 0 && (
        <Card>
          <h2 className="text-h3 text-dark-text mb-3">Recent Messages</h2>
          <div className="space-y-2">
            {broadcasts.map(b => (
              <div key={b.id} className="rounded-md border border-border bg-bdrbg p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="text-[14px] font-[600] text-dark-text">{b.title}</span>
                  <span className="whitespace-nowrap text-[11px] text-gray">{formatRelativeTime(b.created_at)}</span>
                </div>
                <p className="line-clamp-2 text-[12px] text-mid-text">{b.body}</p>
                {b.recipient_count > 0 && (
                  <div className="mt-1 text-[11px] text-gray">Sent to {b.recipient_count} rep{b.recipient_count === 1 ? '' : 's'}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
