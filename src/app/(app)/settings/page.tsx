// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Avatar } from '@/components/ui'
import { BellIcon, LogoutIcon, ShieldIcon, DownloadIcon, ChevronRightIcon, UserIcon } from '@/components/icons'
import { usePushNotifications } from '@/lib/push'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui'

type Section = 'main' | 'profile' | 'notifications' | 'data' | 'help'

const FAQ_ITEMS = [
  { q: 'How is my belt rank calculated?', a: 'Your belt rank advances automatically based on days since your start date. White Belt: Day 0, Black Belt: Day 90.' },
  { q: 'Can I earn XP on the same habit twice?', a: 'No. Each habit can only be logged once per calendar day. The date is locked and cannot be backdated.' },
  { q: 'How does the streak work?', a: 'A streak day requires at least 7 habits completed. Missing one day resets it to zero — no streak freezes, keeping it fair for everyone.' },
  { q: 'How is quiz XP calculated?', a: 'XP is awarded on your first attempt only: 45 XP (60–79%), 65 XP (80–89%), 75 XP (90–100%). Retakes are for learning only.' },
  { q: 'Who can see my data?', a: 'Your manager can see your activity and progress. Your wins, habits, and quiz scores are private to your team only. No other teams can see your data.' },
]

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [section, setSection] = useState<Section>('main')
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const { permission, subscribed, supported, loading: pushLoading, requestPermission, unsubscribe } = usePushNotifications()
  const [notifPrefs, setNotifPrefs] = useState({
    push_enabled: true, email_enabled: true, habit_reminder: true,
    streak_alert: true, belt_advance: true, leaderboard: true,
    new_resource: true, manager_message: true, weekly_digest: true,
    quiet_hours_start: '21:00', quiet_hours_end: '07:00',
  })
  const [expandedFaq, setExpandedFaq] = useState<number|null>(null)

  useEffect(() => { loadUser() }, [])

  const loadUser = async () => {
    const { data: { user: auth } } = await supabase.auth.getUser()
    if (!auth) return
    const { data } = await supabase.from('users').select('name, email, phone, role, avatar_url, notification_preferences').eq('id', auth.id).single()
    if (data) {
      setUser(data)
      setForm({ name: data.name ?? '', phone: data.phone ?? '' })
      if (data.notification_preferences) setNotifPrefs(p => ({ ...p, ...data.notification_preferences }))
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    const { data: { user: auth } } = await supabase.auth.getUser()
    if (!auth) { setSaving(false); return }
    const { error } = await supabase.from('users').update({ name: form.name, phone: form.phone || null }).eq('id', auth.id)
    setSaving(false)
    if (!error) { await loadUser(); toast.success('Profile saved') } else toast.error('Failed to save')
  }

  const saveNotifPrefs = async () => {
    const { data: { user: auth } } = await supabase.auth.getUser()
    if (!auth) return
    await supabase.from('users').update({ notification_preferences: notifPrefs }).eq('id', auth.id)
    toast.success('Preferences saved')
  }

  const exportData = async () => {
    const { data: { user: auth } } = await supabase.auth.getUser()
    if (!auth) return
    const [{ data: wins }, { data: habits }, { data: prog }] = await Promise.all([
      supabase.from('wins').select('*').eq('user_id', auth.id),
      supabase.from('habit_logs').select('*').eq('user_id', auth.id),
      supabase.from('user_progress').select('*').eq('user_id', auth.id).single(),
    ])
    const exportObj = { exported_at: new Date().toISOString(), user, progress: prog, wins, habit_logs: habits }
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `bdr-onboarding-export-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported')
  }

  if (section === 'main') return (
    <div className="space-y-4">
      <h1 className="text-h1 text-dark-text">Settings</h1>
      <Card>
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar_url ?? null} name={user?.name ?? ''} size={48} />
          <div className="flex-1">
            <div className="font-semibold text-dark-text">{user?.name}</div>
            <div className="text-xs text-gray">{user?.email}</div>
            <div className="text-xs text-teal capitalize font-medium">{user?.role}</div>
          </div>
          <button onClick={() => router.push('/settings/profile')} className="text-sm text-navy font-medium">Edit</button>
        </div>
      </Card>

      {[
        { icon: <BellIcon className="text-navy w-5 h-5" />, label: 'Notifications', sub: 'Reminders, quiet hours', onPress: () => setSection('notifications') },
        { icon: <DownloadIcon className="text-green-600 w-5 h-5" />, label: 'My Data', sub: 'Export or delete your data', onPress: () => setSection('data') },
        { icon: <ShieldIcon className="text-purple-600 w-5 h-5" />, label: 'Help & FAQ', sub: 'Common questions answered', onPress: () => setSection('help') },
      ].map(item => (
        <button key={item.label} onClick={item.onPress} className="w-full text-left">
          <Card className="flex items-center gap-3 hover:border-navy/20 transition-colors">
            <div className="w-9 h-9 bg-bdrbg rounded-xl flex items-center justify-center flex-shrink-0">{item.icon}</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-dark-text">{item.label}</div>
              <div className="text-xs text-gray">{item.sub}</div>
            </div>
            <ChevronRightIcon className="text-gray w-4 h-4" />
          </Card>
        </button>
      ))}

      <p className="text-center text-xs text-gray">BDR Hub · ConsumerDirect</p>

      <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
        className="w-full flex items-center justify-center gap-2 p-4 bg-error/5 text-error rounded-2xl border border-error/20 font-medium text-sm hover:bg-error/10 transition-colors">
        <LogoutIcon />Sign Out
      </button>
    </div>
  )

  if (section === 'profile') return (
    <div className="space-y-4">
      <button onClick={() => setSection('main')} className="text-sm text-navy font-medium">← Back</button>
      <h1 className="text-h1 text-dark-text">Edit Profile</h1>
      <Card className="space-y-4">
        {[['Full Name','name','text'], ['Phone','phone','tel']].map(([label, key, type]) => (
          <div key={key}>
            <label className="text-label text-mid-text mb-1 block">{label}</label>
            <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
          </div>
        ))}
        <div>
          <label className="text-label text-mid-text mb-1 block">Email</label>
          <input disabled value={user?.email ?? ''} className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-bdrbg text-gray" />
          <p className="text-xs text-gray mt-1">Email cannot be changed</p>
        </div>
        <Button onClick={saveProfile} loading={saving} className="w-full">Save Profile</Button>
      </Card>
    </div>
  )

  if (section === 'notifications') return (
    <div className="space-y-4">
      <button onClick={() => setSection('main')} className="text-sm text-navy font-medium">← Back</button>
      <h1 className="text-h1 text-dark-text">Notifications</h1>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-dark-text">Push Notifications</div>
            <div className="text-xs text-gray">{subscribed ? 'Active' : 'Disabled'}</div>
          </div>
          {supported ? (
            subscribed
              ? <button onClick={unsubscribe} className="text-xs text-error font-medium px-3 py-1 border border-red-200 rounded-lg">Disable</button>
              : <button onClick={requestPermission} disabled={pushLoading} className="text-sm text-white font-medium bg-teal px-3 py-1 rounded-lg">
                  {pushLoading ? '…' : 'Enable'}
                </button>
          ) : <span className="text-xs text-gray">Not supported on this device</span>}
        </div>
      </Card>

      <Card>
        <h2 className="text-h3 text-dark-text mb-3">Alert Types</h2>
        <div className="space-y-3">
          {[
            { key: 'habit_reminder',  label: 'Habit Reminders',  desc: '3pm if habits not done' },
            { key: 'streak_alert',    label: 'Streak Alerts',    desc: 'When streak is at risk' },
            { key: 'belt_advance',    label: 'Belt Advances',    desc: 'When you earn a new belt' },
            { key: 'manager_message', label: 'Manager Messages', desc: 'Direct messages' },
            { key: 'new_resource',    label: 'New Resources',    desc: 'Manager adds content' },
            { key: 'leaderboard',     label: 'Leaderboard',      desc: 'Top 3 movement' },
            { key: 'weekly_digest',   label: 'Weekly Digest',    desc: 'Friday summary email' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-dark-text">{label}</div>
                <div className="text-xs text-gray">{desc}</div>
              </div>
              <button onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                className={cn('w-12 h-6 rounded-full transition-colors relative flex-shrink-0', notifPrefs[key] ? 'bg-teal' : 'bg-border')}>
                <div className={cn('w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform', notifPrefs[key] ? 'translate-x-6' : 'translate-x-0.5')} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-h3 text-dark-text mb-3">Quiet Hours</h2>
        <div className="grid grid-cols-2 gap-3">
          {[['quiet_hours_start','Start'],['quiet_hours_end','End']].map(([key, label]) => (
            <div key={key}>
              <label className="text-label text-mid-text mb-1 block">{label}</label>
              <input type="time" value={notifPrefs[key]} onChange={e => setNotifPrefs(p => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
            </div>
          ))}
        </div>
      </Card>
      <Button onClick={saveNotifPrefs} className="w-full">Save Preferences</Button>
    </div>
  )

  if (section === 'data') return (
    <div className="space-y-4">
      <button onClick={() => setSection('main')} className="text-sm text-navy font-medium">← Back</button>
      <h1 className="text-h1 text-dark-text">My Data</h1>
      <Card>
        <div className="text-sm font-semibold text-dark-text mb-1">Export My Data</div>
        <div className="text-xs text-gray mb-3">Download all your activity, wins, and progress as JSON.</div>
        <Button onClick={exportData} variant="secondary" size="sm">Export Data</Button>
      </Card>
      <Card className="border-red-200">
        <div className="text-sm font-semibold text-dark-text mb-1">Delete Account</div>
        <div className="text-xs text-gray mb-3">Permanently delete your account. This cannot be undone.</div>
        <button onClick={() => toast.error('Contact your manager to delete your account.')}
          className="text-sm text-error font-medium border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
          Delete Account
        </button>
      </Card>
    </div>
  )

  if (section === 'help') return (
    <div className="space-y-4">
      <button onClick={() => setSection('main')} className="text-sm text-navy font-medium">← Back</button>
      <h1 className="text-h1 text-dark-text">Help & FAQ</h1>
      {FAQ_ITEMS.map((item, i) => (
        <Card key={i}>
          <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
            className="w-full flex items-start justify-between gap-3 text-left">
            <span className="text-sm font-medium text-dark-text">{item.q}</span>
            <span className="text-gray text-lg leading-none flex-shrink-0">{expandedFaq === i ? '−' : '+'}</span>
          </button>
          {expandedFaq === i && <p className="text-sm text-gray mt-3 pt-3 border-t border-border">{item.a}</p>}
        </Card>
      ))}
      <Card>
        <div className="text-sm font-medium text-dark-text mb-1">Contact Support</div>
        <a href="mailto:support@consumerdirect.com" className="text-sm text-teal font-medium">
          support@consumerdirect.com
        </a>
      </Card>
    </div>
  )

  return null
}
