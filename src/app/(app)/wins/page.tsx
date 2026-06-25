// @ts-nocheck
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Modal, Badge } from '@/components/ui'
import { TrophyIcon, PlusIcon, XpIcon } from '@/components/icons'
import { cn, formatXP, formatRelativeTime } from '@/lib/utils'
import { toast } from '@/components/ui'

const WIN_TYPES = [
  { type: 'call',   label: 'Call',  emoji: '📞', xp: 10,  color: 'bg-blue-100 text-blue-700' },
  { type: 'demo',   label: 'Demo',  emoji: '🎯', xp: 25,  color: 'bg-purple-100 text-purple-700' },
  { type: 'deal',   label: 'Deal',  emoji: '🤝', xp: 100, color: 'bg-green-100 text-green-700' },
  { type: 'post',   label: 'Post',  emoji: '📢', xp: 15,  color: 'bg-orange-100 text-orange-700' },
  { type: 'client', label: 'Client',emoji: '⭐', xp: 15,  color: 'bg-yellow-100 text-yellow-700' },
]

interface WinRow {
  id: string
  type: string
  description: string
  amount: number | null
  logged_at: string
  xp_earned: number
}

function WinsContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [wins, setWins] = useState<WinRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(searchParams.get('action') === 'new')
  const [selectedType, setSelectedType] = useState('call')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); fetchWins(user.id) }
    })
  }, [])

  const fetchWins = async (uid: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('wins')
      .select('id, type, description, amount, logged_at, xp_earned')
      .eq('user_id', uid)
      .order('logged_at', { ascending: false })
      .limit(50)
    setWins(data ?? [])
    setLoading(false)
  }

  const submitWin = async () => {
    if (!userId || description.trim().length < 10) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase.from('wins').insert({
        user_id: userId,
        type: selectedType,
        description: description.trim(),
        amount: amount ? parseFloat(amount) : null,
      })
      if (error) throw error

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: `${selectedType}_logged`, user_id: userId }),
        }
      )
      const xpData = res.ok ? await res.json() : { xp_earned: 0 }
      toast.xp(`+${xpData.xp_earned} XP — ${WIN_TYPES.find(t => t.type === selectedType)?.label} logged!`)
      setDescription(''); setAmount(''); setShowModal(false); fetchWins(userId)
    } finally { setSubmitting(false) }
  }

  const filtered = filter === 'all' ? wins : wins.filter(w => w.type === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-gray-900">Wins</h1>
          <p className="text-sm text-gray-500">Track every victory</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm">
          <PlusIcon className="mr-1.5 w-4 h-4" />Log Win
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {WIN_TYPES.slice(0, 3).map(wt => {
          const count = wins.filter(w => w.type === wt.type).length
          return (
            <div key={wt.type} className="bg-white rounded-xl border border-border p-3 text-center shadow-card">
              <div className="text-xl mb-1">{wt.emoji}</div>
              <div className="text-h3 font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500">{wt.label}s</div>
            </div>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {['all', ...WIN_TYPES.map(t => t.type)].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              filter === f ? 'bg-navy text-white' : 'bg-white border border-border text-gray-600 hover:bg-gray-50')}>
            {f === 'all' ? 'All' : WIN_TYPES.find(t => t.type === f)?.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-border" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <TrophyIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No wins yet — log your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(win => {
            const wt = WIN_TYPES.find(t => t.type === win.type) ?? WIN_TYPES[0]
            return (
              <Card key={win.id} className="!p-3">
                <div className="flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0', wt.color)}>
                    {wt.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge className={cn('text-xs', wt.color)}>{wt.label}</Badge>
                      {win.amount && <span className="text-xs font-medium text-green-600">${Number(win.amount).toLocaleString()}</span>}
                      {win.xp_earned > 0 && <span className="text-xs text-gold font-medium ml-auto flex items-center gap-0.5"><XpIcon className="w-3 h-3" />+{win.xp_earned}</span>}
                    </div>
                    <p className="text-sm text-gray-700 truncate">{win.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(win.logged_at)}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Log Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Log a Win" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {WIN_TYPES.map(wt => (
              <button key={wt.type} onClick={() => setSelectedType(wt.type)}
                className={cn('flex items-center gap-2 p-3 rounded-xl border transition-all text-left',
                  selectedType === wt.type ? 'border-navy bg-navy/5' : 'border-border bg-gray-50 hover:bg-gray-100')}>
                <span className="text-xl">{wt.emoji}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{wt.label}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1"><XpIcon className="w-3 h-3" />+{wt.xp}</div>
                </div>
              </button>
            ))}
          </div>
          <div>
            <label className="text-label text-gray-700 mb-1 block">Description <span className="text-gray-400 font-normal">(min 10 chars)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this win..." rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none" />
          </div>
          {selectedType === 'deal' && (
            <div>
              <label className="text-label text-gray-700 mb-1 block">Deal Amount (optional)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
            </div>
          )}
          <Button onClick={submitWin} loading={submitting} disabled={description.trim().length < 10} className="w-full" size="lg">
            Log Win &amp; Earn XP
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default function WinsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-10 bg-gray-200 rounded-xl" /></div>}>
      <WinsContent />
    </Suspense>
  )
}
