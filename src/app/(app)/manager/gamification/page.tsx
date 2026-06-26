// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, SkeletonList } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { XpIcon, EditIcon, CheckIcon } from '@/components/icons'
import { toast } from '@/components/ui'

interface GamRule {
  id: string
  rule_key: string
  xp_value: number
  is_active: boolean
}

const RULE_LABELS: Record<string, { label: string; desc: string; group: string }> = {
  lesson_complete:   { label: 'Lesson Completed',          desc: 'Scroll 80%+ through lesson content', group: 'Learning' },
  quiz_pass_60:      { label: 'Quiz Pass (60–79%)',         desc: 'First attempt, 60–79% score',         group: 'Learning' },
  quiz_pass_80:      { label: 'Quiz Pass (80–89%)',         desc: 'First attempt, 80–89% score',         group: 'Learning' },
  quiz_pass_90:      { label: 'Quiz Pass (90–100%)',        desc: 'First attempt, 90–100% score',        group: 'Learning' },
  resource_viewed:   { label: 'Resource Viewed',           desc: 'Viewed for 3+ minutes',               group: 'Learning' },
  drill_complete:    { label: 'Objection Drill Won',       desc: 'AI roleplay won · max 5/day',         group: 'Learning' },
  call_logged:       { label: 'Call Logged',               desc: 'Cross-referenced with HubSpot',       group: 'Activity' },
  demo_logged:       { label: 'Demo Logged',               desc: 'Cross-referenced with HubSpot',       group: 'Activity' },
  deal_closed:       { label: 'Deal Closed',               desc: 'Manager-auditable, HubSpot verified', group: 'Activity' },
  win_logged:        { label: 'Win Logged',                desc: 'Min 10-char description required',    group: 'Activity' },
  habit_complete:    { label: 'Habit Completed',           desc: 'Date-locked, max 14 per day',         group: 'Habits'   },
  belt_advance:      { label: 'Belt Advance Bonus',        desc: 'Automatic at each belt milestone',    group: 'Milestones' },
  module_complete:   { label: 'Module Complete',           desc: 'All lessons + quiz passed',           group: 'Milestones' },
  first_deal:        { label: 'First Deal Ever',           desc: 'One-time milestone bonus',            group: 'Milestones' },
  tenth_deal:        { label: '10th Deal',                 desc: 'One-time milestone bonus',            group: 'Milestones' },
  black_belt_complete: { label: 'Black Belt (Day 90)',     desc: 'Ultimate achievement bonus',          group: 'Milestones' },
}

export default function GamificationPage() {
  const supabase = createClient()
  const [rules, setRules] = useState<GamRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [teamId, setTeamId] = useState<string>()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (data?.team_id) { setTeamId(data.team_id); fetchRules(data.team_id) }
        else setLoading(false)
      })
    })
  }, [])

  const fetchRules = async (tid: string) => {
    const { data } = await supabase
      .from('gamification_rules')
      .select('id, rule_key, xp_value, is_active')
      .eq('team_id', tid)
      .order('rule_key')
    setRules(data ?? [])
    setLoading(false)
  }

  const startEdit = (rule: GamRule) => {
    setEditingId(rule.id)
    setEditValue(String(rule.xp_value))
  }

  const saveEdit = async (ruleId: string) => {
    const xp = parseInt(editValue)
    if (isNaN(xp) || xp < 0 || xp > 9999) {
      toast.error('Enter a value between 0 and 9999')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('gamification_rules')
      .update({ xp_value: xp, updated_at: new Date().toISOString() })
      .eq('id', ruleId)

    if (!error) {
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, xp_value: xp } : r))
      toast.success('XP value updated')
    } else {
      toast.error('Failed to save')
    }
    setEditingId(null)
    setSaving(false)
  }

  const toggleActive = async (rule: GamRule) => {
    const { error } = await supabase
      .from('gamification_rules')
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id)

    if (!error) {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    }
  }

  // Group rules by category
  const groups = Object.keys(RULE_LABELS).reduce((acc, key) => {
    const group = RULE_LABELS[key]?.group ?? 'Other'
    if (!acc[group]) acc[group] = []
    const rule = rules.find(r => r.rule_key === key)
    if (rule) acc[group].push(rule)
    return acc
  }, {} as Record<string, GamRule[]>)

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="XP Rules" subtitle="Tune how XP is awarded for your team. Changes apply immediately." />

      {loading ? (
        <SkeletonList count={3} />
      ) : (
        Object.entries(groups).map(([group, groupRules]) => groupRules.length > 0 && (
          <Card key={group}>
            <h2 className="text-h3 text-dark-text mb-3">{group}</h2>
            <div className="space-y-3">
              {groupRules.map(rule => {
                const meta = RULE_LABELS[rule.rule_key]
                const isEditing = editingId === rule.id
                return (
                  <div key={rule.id} className={`flex items-start gap-3 p-3 rounded-md border ${rule.is_active ? 'border-border bg-bdrbg' : 'border-dashed border-border opacity-60'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-[600] text-dark-text">{meta?.label ?? rule.rule_key}</div>
                      <div className="text-[12px] text-gray">{meta?.desc}</div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit(rule.id)}
                          autoFocus
                          className="w-20 px-2 py-1 rounded-md border border-navy text-sm text-center focus:outline-none"
                          min="0"
                          max="9999"
                        />
                        <button
                          onClick={() => saveEdit(rule.id)}
                          disabled={saving}
                          className="w-7 h-7 bg-teal rounded-md flex items-center justify-center"
                        >
                          <CheckIcon className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-[14px] font-[700] text-dark-text">
                          <XpIcon className="w-4 h-4 text-gold" />
                          {rule.xp_value}
                        </div>
                        <button
                          onClick={() => startEdit(rule)}
                          className="w-7 h-7 bg-bdrbg hover:bg-border rounded-md flex items-center justify-center transition-colors"
                        >
                          <EditIcon className="w-3.5 h-3.5 text-gray" />
                        </button>
                        <button
                          onClick={() => toggleActive(rule)}
                          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors text-xs font-bold ${rule.is_active ? 'bg-teal/10 text-teal' : 'bg-bdrbg text-gray'}`}
                        >
                          {rule.is_active ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        ))
      )}

      <div className="text-[12px] text-gray text-center px-4">
        All XP calculations happen server-side and cannot be bypassed by reps.
      </div>
    </div>
  )
}
