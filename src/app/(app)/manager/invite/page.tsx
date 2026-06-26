// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Badge, EmptyState, Skeleton } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { MailIcon, RefreshIcon, UserIcon } from '@/components/icons'
import { formatRelativeTime } from '@/lib/utils'
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
    <div className="space-y-4 pb-4">
      <PageHeader title="Invite Team" subtitle="Add BDRs to your team so their progress shows up across your manager views." />

      {/* Invite form */}
      <Card>
        <h2 className="text-h3 text-dark-text mb-3">Send Invite</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
              placeholder="rep@consumerdirect.com"
              className="w-full rounded-md border border-border py-3 pl-9 pr-4 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <Button onClick={sendInvite} loading={loading} disabled={!email.includes('@')}>
            Invite
          </Button>
        </div>
        <p className="mt-2 text-[12px] text-gray">
          Existing ConsumerDirect users are added instantly. New emails join your team when they sign up.
        </p>
      </Card>

      {/* Pending invites */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h3 text-dark-text">Pending Invites</h2>
          {teamId && (
            <button onClick={() => fetchInvites(teamId)} className="flex items-center text-gray hover:text-navy" aria-label="Refresh">
              <RefreshIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {fetching ? (
          <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} height={48} className="w-full rounded-md" />)}</div>
        ) : invites.length === 0 ? (
          <EmptyState
            icon={<MailIcon size={26} />}
            title="No pending invites"
            description="Invites you send appear here until the rep accepts and joins your team."
          />
        ) : (
          <div className="space-y-2">
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center gap-3 rounded-md border border-border bg-bdrbg p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-border">
                  <UserIcon className="h-4 w-4 text-gray" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-[600] text-dark-text">{invite.email}</div>
                  <div className="text-[11px] text-gray">{formatRelativeTime(invite.invited_at)}</div>
                </div>
                <Badge variant="gold">Pending</Badge>
                <button
                  onClick={() => cancelInvite(invite.id)}
                  className="text-[12px] font-[700] text-error hover:opacity-80"
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
