// calculate-xp — BDR OS v2
// Server-side XP calculation with full anti-cheat verification
// All XP is calculated here — clients can never write XP directly

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse, errorResponse, handleCors } from '../_shared/cors.ts'

// ─── Action Types ────────────────────────────────────────────────────────────
type XpAction =
  | 'lesson_complete'
  | 'quiz_pass'
  | 'call_logged'
  | 'demo_logged'
  | 'deal_closed'
  | 'win_logged'
  | 'habit_complete'
  | 'resource_viewed'
  | 'module_complete'
  | 'day_30_checkin'
  | 'day_90_complete'
  | 'first_deal'
  | 'tenth_deal'

interface XpRequest {
  action: XpAction
  reference_id?: string    // ID of the lesson / habit / win / etc.
  reference_type?: string
  metadata?: Record<string, unknown>
}

interface BeltInfo {
  rank: string
  color: string
  tagline: string
  day: number
}

// ─── Belt Definitions ─────────────────────────────────────────────────────────
const BELTS: BeltInfo[] = [
  { rank: 'White Belt',  color: '#9CA3AF', tagline: 'New Recruit',       day: 0  },
  { rank: 'Yellow Belt', color: '#CA8A04', tagline: 'Finding Your Voice', day: 7  },
  { rank: 'Orange Belt', color: '#C2410C', tagline: 'First Closings',     day: 14 },
  { rank: 'Green Belt',  color: '#059669', tagline: 'Building Momentum',  day: 30 },
  { rank: 'Blue Belt',   color: '#1D4ED8', tagline: 'Consistent Closer',  day: 50 },
  { rank: 'Purple Belt', color: '#6D28D9', tagline: 'Top Performer',      day: 70 },
  { rank: 'Black Belt',  color: '#111827', tagline: 'Elite BDR',          day: 90 },
]

function getBeltForDays(daysSinceStart: number): BeltInfo {
  let belt = BELTS[0]
  for (const b of BELTS) {
    if (daysSinceStart >= b.day) belt = b
  }
  return belt
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  const cors = handleCors(req)
  if (cors) return cors

  // Only POST allowed
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  // ── Authenticate request ────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('Missing authorization', 401)

  // Create admin client with service role (bypasses RLS)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Create user client to verify JWT and get user identity
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) return errorResponse('Invalid token', 401)

  // ── Parse request body ─────────────────────────────────────────────────────
  let body: XpRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const { action, reference_id, reference_type, metadata = {} } = body

  if (!action) return errorResponse('action is required')

  // ── Load user data ─────────────────────────────────────────────────────────
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, team_id, start_date, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData) return errorResponse('User not found', 404)

  // ── Load gamification rules for this team ──────────────────────────────────
  const { data: rules } = await supabaseAdmin
    .from('gamification_rules')
    .select('rule_key, xp_value, is_active')
    .eq('team_id', userData.team_id)
    .eq('is_active', true)

  const ruleMap: Record<string, number> = {}
  for (const rule of rules ?? []) {
    ruleMap[rule.rule_key] = rule.xp_value
  }

  // ── Load current progress ──────────────────────────────────────────────────
  const { data: progress, error: progressError } = await supabaseAdmin
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (progressError || !progress) return errorResponse('Progress record not found', 404)

  // ── Anti-cheat validation ──────────────────────────────────────────────────
  let xpEarned = 0
  let shouldAward = true
  let antiCheatNote = ''

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  switch (action) {
    case 'lesson_complete': {
      if (!reference_id) return errorResponse('reference_id (lesson_id) required')
      // One XP per lesson, forever
      if (progress.completed_lessons?.includes(reference_id)) {
        shouldAward = false
        antiCheatNote = 'Lesson already completed'
      } else {
        xpEarned = ruleMap['lesson_complete'] ?? 25
      }
      break
    }

    case 'quiz_pass': {
      if (!reference_id) return errorResponse('reference_id (module_id) required')
      const percentage = (metadata.percentage as number) ?? 0
      if (percentage < 60) {
        shouldAward = false
        antiCheatNote = 'Score below passing threshold (60%)'
        break
      }
      // Check if this is first attempt
      const { data: attempts } = await supabaseAdmin
        .from('quiz_attempts')
        .select('percentage, xp_earned')
        .eq('user_id', user.id)
        .eq('module_id', reference_id)
        .order('attempted_at', { ascending: true })

      const isFirstAttempt = !attempts || attempts.length === 0
      const previousBest = attempts?.reduce((max, a) => Math.max(max, a.percentage), 0) ?? 0

      if (isFirstAttempt) {
        if (percentage >= 90) xpEarned = ruleMap['quiz_pass_90'] ?? 75
        else if (percentage >= 80) xpEarned = ruleMap['quiz_pass_80'] ?? 65
        else xpEarned = ruleMap['quiz_pass_60'] ?? 45
      } else if (percentage > previousBest) {
        // Improvement bonus only
        const improvement = percentage - previousBest
        xpEarned = Math.floor(improvement * 0.5)
        if (xpEarned === 0) {
          shouldAward = false
          antiCheatNote = 'No improvement over previous best'
        }
      } else {
        shouldAward = false
        antiCheatNote = 'Not first attempt and no improvement'
      }
      break
    }

    case 'habit_complete': {
      if (!reference_id) return errorResponse('reference_id (habit_id) required')
      // Check unique constraint (user + habit + today)
      const { data: existing } = await supabaseAdmin
        .from('habit_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('habit_id', reference_id)
        .eq('date', todayStr)
        .single()

      if (existing) {
        shouldAward = false
        antiCheatNote = 'Habit already logged today'
      } else {
        xpEarned = ruleMap['habit_complete'] ?? 5
        // Check for streak bonus
        const streak = progress.current_streak ?? 0
        if (streak >= 60) xpEarned += ruleMap['streak_60_day_bonus'] ?? 50
        else if (streak >= 30) xpEarned += ruleMap['streak_30_day_bonus'] ?? 35
        else if (streak >= 14) xpEarned += ruleMap['streak_14_day_bonus'] ?? 20
        else if (streak >= 7) xpEarned += ruleMap['streak_7_day_bonus'] ?? 10
      }
      break
    }

    case 'win_logged': {
      if (!reference_id) return errorResponse('reference_id (win_id) required')
      const desc = (metadata.description as string) ?? ''
      if (desc.length < 10) {
        shouldAward = false
        antiCheatNote = 'Description too short (min 10 chars)'
        break
      }
      xpEarned = ruleMap['win_logged'] ?? 15
      break
    }

    case 'call_logged': {
      // Max 1 call XP entry per win record
      if (!reference_id) return errorResponse('reference_id (win_id) required')
      const { data: existing } = await supabaseAdmin
        .from('xp_ledger')
        .select('id')
        .eq('user_id', user.id)
        .eq('reference_id', reference_id)
        .eq('action', 'call_logged')
        .single()
      if (existing) {
        shouldAward = false
        antiCheatNote = 'Call already credited'
      } else {
        xpEarned = ruleMap['call_logged'] ?? 10
      }
      break
    }

    case 'demo_logged': {
      if (!reference_id) return errorResponse('reference_id (win_id) required')
      const { data: existing } = await supabaseAdmin
        .from('xp_ledger')
        .select('id')
        .eq('user_id', user.id)
        .eq('reference_id', reference_id)
        .eq('action', 'demo_logged')
        .single()
      if (existing) {
        shouldAward = false
        antiCheatNote = 'Demo already credited'
      } else {
        xpEarned = ruleMap['demo_logged'] ?? 25
      }
      break
    }

    case 'deal_closed': {
      if (!reference_id) return errorResponse('reference_id (win_id) required')
      const { data: existing } = await supabaseAdmin
        .from('xp_ledger')
        .select('id')
        .eq('user_id', user.id)
        .eq('reference_id', reference_id)
        .eq('action', 'deal_closed')
        .single()
      if (existing) {
        shouldAward = false
        antiCheatNote = 'Deal already credited'
      } else {
        xpEarned = ruleMap['deal_closed'] ?? 100
        // First deal milestone
        if (progress.total_deals === 0) {
          xpEarned += ruleMap['first_deal'] ?? 250
        }
        // 10th deal milestone
        if (progress.total_deals === 9) {
          xpEarned += ruleMap['tenth_deal'] ?? 500
        }
      }
      break
    }

    case 'resource_viewed': {
      if (!reference_id) return errorResponse('reference_id (resource_id) required')
      // Can only earn resource XP once per resource
      const { data: existing } = await supabaseAdmin
        .from('xp_ledger')
        .select('id')
        .eq('user_id', user.id)
        .eq('reference_id', reference_id)
        .eq('action', 'resource_viewed')
        .single()
      if (existing) {
        shouldAward = false
        antiCheatNote = 'Resource already credited'
      } else {
        xpEarned = ruleMap['resource_viewed'] ?? 10
      }
      break
    }

    case 'module_complete': {
      if (!reference_id) return errorResponse('reference_id (module_id) required')
      if (progress.learning_done?.includes(reference_id)) {
        shouldAward = false
        antiCheatNote = 'Module already completed'
      } else {
        xpEarned = ruleMap['module_complete'] ?? 100
      }
      break
    }

    default:
      return errorResponse(`Unknown action: ${action}`)
  }

  // ── Suspicious activity check ──────────────────────────────────────────────
  if (shouldAward) {
    const { count } = await supabaseAdmin
      .from('xp_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString()) // last 1 minute

    if ((count ?? 0) > 20) {
      shouldAward = false
      antiCheatNote = 'Suspicious activity: too many actions in 1 minute'
      // Log the suspicious activity
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        action: 'suspicious_activity',
        metadata: { action, count, note: antiCheatNote },
      })
    }
  }

  // ── Award XP ───────────────────────────────────────────────────────────────
  if (!shouldAward || xpEarned === 0) {
    return jsonResponse({
      awarded: false,
      xp_earned: 0,
      reason: antiCheatNote,
      total_xp: progress.total_xp,
    })
  }

  // ── Calculate new belt ─────────────────────────────────────────────────────
  const startDate = new Date(userData.start_date)
  const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const currentBelt = getBeltForDays(daysSinceStart)
  const previousBeltName = progress.belt_rank
  const beltAdvanced = currentBelt.rank !== previousBeltName

  // ── Compute updates ────────────────────────────────────────────────────────
  const newTotalXp = progress.total_xp + xpEarned
  const updates: Record<string, unknown> = {
    total_xp: newTotalXp,
    belt_rank: currentBelt.rank,
    belt_day: daysSinceStart,
  }

  // Track specific action counts
  if (action === 'call_logged') updates.total_calls = (progress.total_calls ?? 0) + 1
  if (action === 'demo_logged') updates.total_demos = (progress.total_demos ?? 0) + 1
  if (action === 'deal_closed') updates.total_deals = (progress.total_deals ?? 0) + 1

  if (action === 'lesson_complete' && reference_id) {
    updates.completed_lessons = [...(progress.completed_lessons ?? []), reference_id]
  }

  if (action === 'module_complete' && reference_id) {
    updates.learning_done = [...(progress.learning_done ?? []), reference_id]
  }

  // ── Update habit streak ────────────────────────────────────────────────────
  if (action === 'habit_complete') {
    const lastDate = progress.last_habit_date
    const habitsToday = (progress.habits_completed_today ?? 0) + 1
    updates.habits_completed_today = habitsToday
    updates.last_habit_date = todayStr

    // If user completes 7 habits today, it counts as a streak day
    if (habitsToday >= 7) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      if (lastDate === yesterdayStr || lastDate === todayStr) {
        const newStreak = (progress.current_streak ?? 0) + (lastDate === yesterdayStr ? 1 : 0)
        updates.current_streak = newStreak
        updates.longest_streak = Math.max(newStreak, progress.longest_streak ?? 0)
        updates.last_streak_date = todayStr
      } else if (!lastDate || lastDate < yesterdayStr) {
        updates.current_streak = 1
        updates.last_streak_date = todayStr
      }
    }
  }

  // ── Belt advance bonus ─────────────────────────────────────────────────────
  let beltBonusXp = 0
  if (beltAdvanced) {
    beltBonusXp = ruleMap['belt_advance'] ?? 200
    updates.total_xp = newTotalXp + beltBonusXp
    updates.last_belt_name = currentBelt.rank
  }

  // ── Persist all updates ────────────────────────────────────────────────────
  const { error: updateError } = await supabaseAdmin
    .from('user_progress')
    .update(updates)
    .eq('user_id', user.id)

  if (updateError) {
    console.error('Failed to update user_progress:', updateError)
    return errorResponse('Failed to update progress', 500)
  }

  // ── Write XP ledger entry (immutable audit trail) ─────────────────────────
  await supabaseAdmin.from('xp_ledger').insert({
    user_id: user.id,
    action,
    xp_amount: xpEarned + beltBonusXp,
    reference_id: reference_id ?? null,
    reference_type: reference_type ?? null,
    verified: true,
  })

  // ── Write audit log ────────────────────────────────────────────────────────
  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    action: `xp_awarded_${action}`,
    target_type: reference_type ?? null,
    target_id: reference_id ?? null,
    xp_delta: xpEarned + beltBonusXp,
    metadata: { ...metadata, belt_advanced: beltAdvanced },
  })

  // ── Create belt advance notification ──────────────────────────────────────
  if (beltAdvanced) {
    await supabaseAdmin.from('notifications').insert({
      user_id: user.id,
      type: 'belt_advance',
      title: `You just earned ${currentBelt.rank}`,
      body: `Day ${daysSinceStart} of 90. ${currentBelt.tagline}. Your team has been notified.`,
      action_url: '/home',
      tier: 1,
    })
  }

  // ── Return result ──────────────────────────────────────────────────────────
  return jsonResponse({
    awarded: true,
    xp_earned: xpEarned,
    belt_bonus: beltBonusXp,
    total_xp: newTotalXp + beltBonusXp,
    belt: currentBelt,
    belt_advanced: beltAdvanced,
    previous_belt: beltAdvanced ? previousBeltName : null,
  })
})
