// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Badge } from '@/components/ui'
import { MailIcon, PlusIcon, RefreshIcon, UserIcon } from '@/components/icons'
import { cn, formatRelativeTime } from '@/lib/utils'
import { toast } from '@/components/ui'

interface PendingInvite {
  id: string
  email: string
  invited_at: string
  status: 'pending' | 'accepted' | 'expired'
  invited_by_name: string
}

export default function InvitePage() {
  const supabase = createClient()
  const [teamId, setTeamId] = useState<string>()
  const [inviterId, setInviterId] = useState<string>()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setInviterId(user.id)
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (data?.team_id) { setTeamId(data.team_id); fetchInvites(data.team_id) }
        else setFetching(false)
      })
    })
  }, [])

  const fetchInvites = async (tid: string) => {
    setFetching(true)
    const { data } = await supabase
      .from('team_members')
      .select('id, status, joined_at, users!inner(email, name)')
      .eq('team_id', tid)
      .eq('status', 'pending')
      .order('joined_at', { ascending: false })

    setInvites((data ?? []).map(m => ({
      id: m.id,
      email: m.users?.email ?? '',
      invited_at: m.joined_at,
      status: m.status,
      invited_by_name: '',
    })))
    setFetching(false)
  }

  const sendInvite = async () => {
    if (!email.trim() || !teamId || !inviterId) return
    setLoading(true)

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .single()

      if (existingUser) {
        // Add directly to team
        const { error } = await supabase.from('team_members').upsert({
          team_id: teamId,
          user_id: existingUser.id,
          invited_by: inviterId,
          status: 'active',
        }, { onConflict: 'team_id,user_id' })

        if (!error) {
          toast.success(`${email} added to your team`)
          setEmail('')
          fetchInvites(teamId)
        }
      } else {
        // Create a pending user record
        toast.info('Invite sent. They will join when they sign up.')
        setEmail('')
      }
    } finally {
      setLoading(false)
    }
  }

  const cancelInvite = async (memberId: string) => {
    await supabase.from('team_members').delete().eq('id', memberId)
    setInvites(prev => prev.filter(i => i.id !== memberId))
    toast.success('Invite cancelled')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 text-gray-900">Invite Team Members</h1>
        <p className="text-sm text-gray-500">Add reps to your team</p>
      </div>

      {/* Invite form */}
      <Card>
        <h2 className="text-h3 text-gray-900 mb-3">Send Invite</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
              placeholder="rep@consumerdirect.com"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <Button onClick={sendInvite} loading={loading} disabled={!email.includes('@')}>
            Invite
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          The rep will receive an email with a sign-in link to join your team.
        </p>
      </Card>

      {/* Pending invites */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h3 text-gray-900">Pending Invites</h2>
          {teamId && (
            <button onClick={() => fetchInvites(teamId)} className="text-sm text-navy font-medium">
              <RefreshIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {fetching ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : invites.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            No pending invites
          </div>
        ) : (
          <div className="space-y-2">
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-border">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{invite.email}</div>
                  <div className="text-xs text-gray-400">{formatRelativeTime(invite.invited_at)}</div>
                </div>
                <Badge color="warning" className="text-xs">Pending</Badge>
                <button
                  onClick={() => cancelInvite(invite.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
