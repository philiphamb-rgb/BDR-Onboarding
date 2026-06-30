// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Badge, SkeletonList, toast } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { MailIcon, ShieldIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { ROLES, FEATURES, defaultPerms, effectiveRole, dbRoleFor } from '@/lib/permissions'

export default function RolesPage() {
  const supabase = createClient()
  const [me, setMe] = useState<{ role: string; team_id: string | null }>({ role: 'rep', team_id: null })
  const [members, setMembers] = useState<any[]>([])
  const [overrides, setOverrides] = useState<Record<string, { view: boolean; edit: boolean }>>({})
  const [activeRole, setActiveRole] = useState('rep')
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('rep')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data: u } = await supabase.from('users').select('role, team_id').eq('id', user.id).single()
      setMe({ role: effectiveRole(u?.role), team_id: u?.team_id ?? null })
      if (u?.team_id) {
        const [{ data: mem }, { data: rp }] = await Promise.all([
          supabase.from('users').select('id, name, email, role').eq('team_id', u.team_id),
          supabase.from('role_permissions').select('role, feature_key, can_view, can_edit').eq('team_id', u.team_id),
        ])
        setMembers(mem ?? [])
        const ov: any = {}
        for (const r of rp ?? []) ov[`${r.role}:${r.feature_key}`] = { view: r.can_view, edit: r.can_edit }
        setOverrides(ov)
      }
      setLoading(false)
    })
  }, [])

  const isAdmin = me.role === 'admin'
  const groups = [...new Set(FEATURES.map(f => f.group))]
  const roleDefaults = defaultPerms(activeRole)
  const permFor = (featureKey: string) => overrides[`${activeRole}:${featureKey}`] ?? roleDefaults[featureKey]

  const setPerm = async (featureKey: string, patch: { view?: boolean; edit?: boolean }) => {
    if (!isAdmin || !me.team_id) return
    const cur = permFor(featureKey)
    let next = { view: patch.view ?? cur.view, edit: patch.edit ?? cur.edit }
    if (next.edit) next.view = true        // edit implies view
    if (!next.view) next.edit = false       // no view → no edit
    setOverrides(prev => ({ ...prev, [`${activeRole}:${featureKey}`]: next }))
    await supabase.from('role_permissions').upsert({
      team_id: me.team_id, role: activeRole, feature_key: featureKey,
      can_view: next.view, can_edit: next.edit, updated_at: new Date().toISOString(),
    }, { onConflict: 'team_id,role,feature_key' })
  }

  const changeMemberRole = async (id: string, role: string) => {
    if (!isAdmin) return
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role: dbRoleFor(role) } : m))
    await supabase.from('users').update({ role: dbRoleFor(role) }).eq('id', id)
    toast.success('Role updated')
  }

  const sendInvite = async () => {
    if (!email.includes('@') || !me.team_id) return
    setInviting(true)
    try {
      const { data: existing } = await supabase.from('users').select('id').eq('email', email.trim().toLowerCase()).single()
      if (existing) {
        await supabase.from('team_members').upsert({ team_id: me.team_id, user_id: existing.id, status: 'active' }, { onConflict: 'team_id,user_id' })
        await supabase.from('users').update({ role: dbRoleFor(inviteRole), team_id: me.team_id }).eq('id', existing.id)
        toast.success(`${email} added as ${inviteRole}`)
        setEmail('')
        const { data: mem } = await supabase.from('users').select('id, name, email, role').eq('team_id', me.team_id)
        setMembers(mem ?? [])
      } else {
        toast.info('Invite noted — they join with this role when they sign up.')
        setEmail('')
      }
    } finally { setInviting(false) }
  }

  const Toggle = ({ on, disabled, onClick }: any) => (
    <button role="switch" aria-checked={on} disabled={disabled} onClick={onClick}
      className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        on ? 'bg-teal' : 'bg-gray-300', disabled && 'opacity-50')}>
      <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', on ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  )

  if (loading) return <div className="space-y-4"><SkeletonList count={3} /></div>

  return (
    <div className="space-y-4 pb-4 stagger-rise">
      <PageHeader title="Roles & Permissions" subtitle="Define what each role can see and edit, and assign roles to your team." />

      {/* Invite with required role */}
      <Card>
        <h2 className="text-h3 text-dark-text mb-3">Invite a teammate</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rep@consumerdirect.com"
              className="w-full rounded-md border border-border py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
          </div>
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
            className="rounded-md border border-border px-3 py-2.5 text-sm font-[600] text-dark-text focus:outline-none focus:ring-2 focus:ring-navy">
            {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <Button onClick={sendInvite} loading={inviting} disabled={!email.includes('@') || !isAdmin}>Invite</Button>
        </div>
        <p className="mt-2 text-[12px] text-gray">Role is required at invite — every teammate has exactly one role.{!isAdmin && ' Only an Admin can invite or change roles.'}</p>
      </Card>

      {/* Permission matrix */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <ShieldIcon size={16} className="text-navy" />
          <h2 className="text-h3 text-dark-text">Permission matrix</h2>
        </div>
        <p className="text-[12px] text-gray mb-3">Pick a role, then set what it can view and edit. {isAdmin ? 'Changes save instantly.' : 'View-only — ask an Admin to change permissions.'}</p>
        <div className="flex gap-2 mb-4">
          {ROLES.map(r => (
            <button key={r.key} onClick={() => setActiveRole(r.key)}
              className={cn('flex-1 rounded-lg border px-3 py-2 text-[13px] font-[700] transition-all',
                activeRole === r.key ? 'border-navy bg-navy text-white' : 'border-border bg-card text-mid-text hover:border-navy/40')}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {groups.map(g => (
            <div key={g}>
              <div className="label mb-2">{g}</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1 text-[10px] font-[700] uppercase tracking-wide text-gray">
                  <span className="flex-1">Feature</span><span className="w-9 text-center">View</span><span className="w-9 text-center">Edit</span>
                </div>
                {FEATURES.filter(f => f.group === g).map(f => {
                  const p = permFor(f.key)
                  return (
                    <div key={f.key} className="flex items-center gap-2 rounded-lg border border-border bg-bdrbg px-3 py-2">
                      <span className="flex-1 text-[13px] font-[600] text-dark-text">{f.label}</span>
                      <Toggle on={p.view} disabled={!isAdmin} onClick={() => setPerm(f.key, { view: !p.view })} />
                      <Toggle on={p.edit} disabled={!isAdmin} onClick={() => setPerm(f.key, { edit: !p.edit })} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Team members + roles */}
      <Card>
        <h2 className="text-h3 text-dark-text mb-3">Team members</h2>
        {members.length === 0 ? (
          <p className="text-sm text-gray">No team members yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-bdrbg p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-[700] text-dark-text">{m.name || m.email}</div>
                  <div className="truncate text-[11px] text-gray">{m.email}</div>
                </div>
                {isAdmin ? (
                  <select value={effectiveRole(m.role)} onChange={e => changeMemberRole(m.id, e.target.value)}
                    className="rounded-md border border-border px-2 py-1.5 text-[12px] font-[700] text-dark-text focus:outline-none focus:ring-2 focus:ring-navy">
                    {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                ) : (
                  <Badge variant="navy">{ROLES.find(r => r.key === effectiveRole(m.role))?.label}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
