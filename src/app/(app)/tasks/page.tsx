// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, SkeletonCard, toast } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { CheckIcon, PlusIcon, TrashIcon, StarFilledIcon, ClockIcon, ChevronRightIcon, CalendarIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { OPTIMIZED_DAY } from '@/lib/schedule'

export default function TasksPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [lists, setLists] = useState<any[]>([])
  const [activeList, setActiveList] = useState<string | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newSub, setNewSub] = useState('')
  const [showDone, setShowDone] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [dragId, setDragId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      let { data: ls } = await supabase.from('task_lists').select('*').eq('user_id', user.id).order('order_index')
      if (!ls || ls.length === 0) {
        const { data: created } = await supabase.from('task_lists').insert({ user_id: user.id, name: 'My Tasks', order_index: 0 }).select().single()
        ls = created ? [created] : []
      }
      setLists(ls); setActiveList(ls[0]?.id ?? null)
      const { data: ts } = await supabase.from('tasks').select('*').eq('user_id', user.id).order('order_index')
      setTasks(ts ?? [])
      setLoading(false)
    })
  }, [])

  const patch = async (id: string, p: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...p } : t))
    await supabase.from('tasks').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const addTask = async () => {
    const title = newTitle.trim()
    if (!title || !userId || !activeList) return
    setNewTitle('')
    const order = Math.max(0, ...topLevel.map(t => t.order_index ?? 0)) + 1
    const { data } = await supabase.from('tasks').insert({ user_id: userId, list_id: activeList, title, order_index: order }).select().single()
    if (data) setTasks(prev => [...prev, data])
  }

  const addSubtask = async (parentId: string) => {
    const title = newSub.trim()
    if (!title || !userId) return
    setNewSub('')
    const { data } = await supabase.from('tasks').insert({ user_id: userId, list_id: activeList, parent_id: parentId, title }).select().single()
    if (data) setTasks(prev => [...prev, data])
  }

  const del = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id && t.parent_id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  const addList = async () => {
    const name = prompt('New list name')?.trim()
    if (!name || !userId) return
    const { data } = await supabase.from('task_lists').insert({ user_id: userId, name, order_index: lists.length }).select().single()
    if (data) { setLists(prev => [...prev, data]); setActiveList(data.id) }
  }

  const assignToBlock = async (id: string, blockKey: string) => {
    await patch(id, { scheduled_day: today, scheduled_block: blockKey })
    toast.success('Added to today’s Time Blocks')
  }

  // Drag-to-reorder (desktop).
  const onDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return setDragId(null)
    const ids = topLevel.map(t => t.id)
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return setDragId(null)
    ids.splice(to, 0, ids.splice(from, 1)[0])
    const reordered = ids.map((id, i) => ({ id, order_index: i }))
    setTasks(prev => prev.map(t => { const r = reordered.find(x => x.id === t.id); return r ? { ...t, order_index: r.order_index } : t }))
    setDragId(null)
    await Promise.all(reordered.map(r => supabase.from('tasks').update({ order_index: r.order_index }).eq('id', r.id)))
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>

  const listTasks = tasks.filter(t => t.list_id === activeList && !t.parent_id)
  const topLevel = listTasks.filter(t => showDone || !t.done).sort((a, b) => (a.done - b.done) || (a.order_index - b.order_index))
  const subsOf = (id: string) => tasks.filter(t => t.parent_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const doneCount = listTasks.filter(t => t.done).length

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Tasks" subtitle="Plan your work, then drop tasks into Time Blocks." />

      {/* Lists */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {lists.map(l => (
          <button key={l.id} onClick={() => setActiveList(l.id)}
            className={cn('shrink-0 rounded-full px-3 py-1.5 text-[12px] font-[700] transition-all border',
              activeList === l.id ? 'border-navy bg-navy text-white' : 'border-border bg-card text-mid-text hover:border-navy/40')}>
            {l.name}
          </button>
        ))}
        <button onClick={addList} className="shrink-0 rounded-full border border-dashed border-border px-3 py-1.5 text-[12px] font-[700] text-gray hover:border-navy/40">+ List</button>
      </div>

      {/* Add task */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card">
        <PlusIcon size={18} className="ml-1 text-gray shrink-0" />
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task…" className="flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder-gray" />
        <Button size="sm" onClick={addTask} disabled={!newTitle.trim()}>Add</Button>
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {topLevel.length === 0 && <Card className="text-center !py-8"><p className="text-sm text-gray">No tasks yet. Add your first above.</p></Card>}
        {topLevel.map(t => {
          const subs = subsOf(t.id)
          const subsDone = subs.filter(s => s.done).length
          const isOpen = expanded === t.id
          return (
            <Card key={t.id} className={cn('!p-0 overflow-hidden', t.done && 'opacity-70')}
              draggable onDragStart={() => setDragId(t.id)} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(t.id)}>
              <div className="flex items-center gap-3 p-3">
                <button onClick={() => patch(t.id, { done: !t.done })} aria-label={t.done ? 'Mark incomplete' : 'Complete'}
                  className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    t.done ? 'border-success bg-success text-white' : 'border-border bg-card text-transparent hover:border-teal')}>
                  <CheckIcon size={14} />
                </button>
                <button onClick={() => setExpanded(isOpen ? null : t.id)} className="min-w-0 flex-1 text-left">
                  <div className={cn('text-[14px] font-[600]', t.done ? 'text-gray line-through' : 'text-dark-text')}>{t.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray">
                    <span className="inline-flex items-center gap-1"><ClockIcon size={11} />{(t.estimated_minutes ?? 30) >= 60 ? `${(t.estimated_minutes ?? 30) / 60}h` : `${t.estimated_minutes ?? 30}m`}</span>
                    {t.due_date && <span className={cn('inline-flex items-center gap-1', t.due_date < today && !t.done && 'text-error font-[700]')}><CalendarIcon size={11} />{t.due_date}</span>}
                    {subs.length > 0 && <span>{subsDone}/{subs.length} subtasks</span>}
                    {t.scheduled_day === today && t.scheduled_block != null && <span className="inline-flex items-center gap-1 text-teal font-[700]"><ClockIcon size={11} />{OPTIMIZED_DAY[+t.scheduled_block]?.label?.split(' — ')[0] ?? 'Scheduled'}</span>}
                  </div>
                </button>
                <button onClick={() => patch(t.id, { priority: !t.priority })} aria-label="Priority" className="shrink-0 p-1">
                  <StarFilledIcon size={16} className={t.priority ? 'text-gold' : 'text-border'} />
                </button>
                <button onClick={() => setExpanded(isOpen ? null : t.id)} aria-label={isOpen ? 'Hide task details' : 'Show task details'} aria-expanded={isOpen} className="shrink-0 p-1 text-gray">
                  <ChevronRightIcon size={16} className={cn('transition-transform', isOpen && 'rotate-90')} />
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-border bg-bdrbg/50 p-3 space-y-3">
                  {/* Subtasks */}
                  <div className="space-y-1.5">
                    {subs.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <button onClick={() => patch(s.id, { done: !s.done })} aria-label={s.done ? 'Mark subtask incomplete' : 'Complete subtask'}
                          className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', s.done ? 'border-success bg-success text-white' : 'border-border text-transparent')}>
                          <CheckIcon size={11} />
                        </button>
                        <span className={cn('flex-1 text-[13px]', s.done ? 'text-gray line-through' : 'text-mid-text')}>{s.title}</span>
                        <button onClick={() => del(s.id)} aria-label="Delete subtask" className="p-1 text-gray hover:text-error"><TrashIcon size={13} /></button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input value={isOpen ? newSub : ''} onChange={e => setNewSub(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask(t.id)}
                        placeholder="Add a subtask…" className="flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-[12px] outline-none placeholder-gray" />
                      <button onClick={() => addSubtask(t.id)} className="text-[12px] font-[700] text-teal">Add</button>
                    </div>
                  </div>

                  {/* Due + notes + schedule */}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] font-[700] text-gray">Due date
                      <input type="date" value={t.due_date ?? ''} onChange={e => patch(t.id, { due_date: e.target.value || null })}
                        className="mt-1 w-full rounded-md border border-border bg-card px-2 py-1.5 text-[12px]" />
                    </label>
                    <label className="text-[11px] font-[700] text-gray">Reminder
                      <input type="datetime-local" value={t.remind_at ? t.remind_at.slice(0, 16) : ''} onChange={e => patch(t.id, { remind_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="mt-1 w-full rounded-md border border-border bg-card px-2 py-1.5 text-[12px]" />
                    </label>
                  </div>
                  <label className="block text-[11px] font-[700] text-gray">Estimated time (powers auto-triage)
                    <select value={t.estimated_minutes ?? 30} onChange={e => patch(t.id, { estimated_minutes: parseInt(e.target.value, 10) })}
                      className="mt-1 w-full rounded-md border border-border bg-card px-2 py-1.5 text-[12px] font-[600] text-dark-text">
                      {[10, 15, 20, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m >= 60 ? `${m / 60}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m} min`}</option>)}
                    </select>
                  </label>
                  <textarea value={t.notes ?? ''} onChange={e => patch(t.id, { notes: e.target.value })} rows={2} placeholder="Notes…"
                    className="w-full resize-none rounded-md border border-border bg-card px-2 py-1.5 text-[12px] outline-none placeholder-gray" />

                  {/* Assign to a time block today */}
                  <div>
                    <div className="text-[11px] font-[700] text-gray mb-1">Add to today’s Time Blocks</div>
                    <div className="flex flex-wrap gap-1.5">
                      {OPTIMIZED_DAY.filter(b => b.type === 'focus' || b.type === 'plan' || b.type === 'admin').map((b) => {
                        const idx = OPTIMIZED_DAY.indexOf(b)
                        const on = t.scheduled_day === today && t.scheduled_block === String(idx)
                        return (
                          <button key={idx} onClick={() => assignToBlock(t.id, String(idx))}
                            className={cn('rounded-md border px-2 py-1 text-[11px] font-[700]', on ? 'border-teal bg-teal/10 text-teal' : 'border-border text-mid-text hover:border-teal/40')}>
                            {b.label.split(' — ')[0]}
                          </button>
                        )
                      })}
                      {t.scheduled_day === today && t.scheduled_block != null && (
                        <button onClick={() => patch(t.id, { scheduled_day: null, scheduled_block: null })} className="rounded-md px-2 py-1 text-[11px] font-[700] text-gray hover:text-error">Clear</button>
                      )}
                    </div>
                  </div>

                  <button onClick={() => del(t.id)} className="flex items-center gap-1 text-[12px] font-[700] text-gray hover:text-error"><TrashIcon size={13} /> Delete task</button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {doneCount > 0 && (
        <button onClick={() => setShowDone(s => !s)} className="text-[12px] font-[700] text-gray hover:text-dark-text">
          {showDone ? 'Hide' : 'Show'} {doneCount} completed
        </button>
      )}
    </div>
  )
}
