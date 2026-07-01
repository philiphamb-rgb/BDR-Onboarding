// calculate-xp — BDR OS v4 (tolerant fields, ledger dedupe, drill + partner XP, streak=all-habits)
// Server-side XP calculation with anti-cheat verification. All XP is calculated
// here — clients can never write XP directly. Deployed via Supabase Edge Functions.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' }
function jsonResponse(data: unknown, status = 200): Response { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
function errorResponse(message: string, status = 400): Response { return jsonResponse({ error: message }, status) }
function handleCors(req: Request): Response | null { if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders }); return null }

const BELTS = [
  { rank: 'White Belt',  color: '#9CA3AF', tagline: 'New Recruit',       day: 0  },
  { rank: 'Yellow Belt', color: '#CA8A04', tagline: 'Finding Your Voice', day: 7  },
  { rank: 'Orange Belt', color: '#C2410C', tagline: 'First Closings',     day: 14 },
  { rank: 'Green Belt',  color: '#059669', tagline: 'Building Momentum',  day: 30 },
  { rank: 'Blue Belt',   color: '#1D4ED8', tagline: 'Consistent Closer',  day: 50 },
  { rank: 'Purple Belt', color: '#6D28D9', tagline: 'Top Performer',      day: 70 },
  { rank: 'Black Belt',  color: '#111827', tagline: 'Elite BDR',          day: 90 },
]
function getBeltForDays(d: number) { let belt = BELTS[0]; for (const b of BELTS) { if (d >= b.day) belt = b }; return belt }

serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('Missing authorization', 401)

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const supabaseUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) return errorResponse('Invalid token', 401)

  let body: any
  try { body = await req.json() } catch { return errorResponse('Invalid JSON') }

  // Normalize action + resolve a reference id from any of the field names clients use.
  const action = body.action === 'deal_logged' ? 'deal_closed' : body.action
  const refId = body.reference_id ?? body.lesson_id ?? body.habit_id ?? body.module_id ?? body.win_id ?? body.partner_id ?? null
  const reference_type = body.reference_type ?? null
  const metadata = body.metadata ?? {}
  if (!action) return errorResponse('action is required')

  const { data: userData } = await supabaseAdmin.from('users').select('id, team_id, start_date').eq('id', user.id).single()
  if (!userData) return errorResponse('User not found', 404)

  const { data: rules } = await supabaseAdmin.from('gamification_rules').select('rule_key, xp_value').eq('team_id', userData.team_id).eq('is_active', true)
  const ruleMap: Record<string, number> = {}
  for (const rule of rules ?? []) ruleMap[rule.rule_key] = rule.xp_value

  const { data: progress } = await supabaseAdmin.from('user_progress').select('*').eq('user_id', user.id).single()
  if (!progress) return errorResponse('Progress not found', 404)

  const todayStr = new Date().toISOString().split('T')[0]
  const startOfToday = todayStr + 'T00:00:00'
  let xpEarned = 0
  let shouldAward = true
  let reason = ''

  if (action === 'lesson_complete') {
    if (!refId) return errorResponse('lesson id required')
    // Dedupe via the immutable ledger so a client-side completed_lessons pre-write can't block the award.
    const { data: led } = await supabaseAdmin.from('xp_ledger').select('id').eq('user_id', user.id).eq('action', 'lesson_complete').eq('reference_id', refId).maybeSingle()
    if (led) { shouldAward = false; reason = 'Already awarded' }
    else xpEarned = ruleMap['lesson_complete'] ?? 25
  } else if (action === 'quiz_pass_60' || action === 'quiz_pass_80' || action === 'quiz_pass_90') {
    // First passing attempt only (matches the Settings FAQ promise). Dedupe across
    // ALL three tiers for this module via the immutable ledger; when no module ref
    // is supplied, fall back to honoring the client's is_first_attempt flag.
    const base = ruleMap[action] ?? (action === 'quiz_pass_90' ? 75 : action === 'quiz_pass_80' ? 65 : 45)
    if (refId) {
      const { data: led } = await supabaseAdmin.from('xp_ledger').select('id').eq('user_id', user.id).like('action', 'quiz_pass%').eq('reference_id', refId).maybeSingle()
      if (led) { shouldAward = false; reason = 'Quiz XP already awarded for this module' }
      else xpEarned = base
    } else if (body.is_first_attempt === false) {
      shouldAward = false; reason = 'Retake — quiz XP is awarded on the first attempt only'
    } else {
      xpEarned = base
    }
  } else if (action === 'habit_complete') {
    if (!refId) return errorResponse('habit id required')
    const { data: led } = await supabaseAdmin.from('xp_ledger').select('id').eq('user_id', user.id).eq('action', 'habit_complete').eq('reference_id', refId).gte('created_at', startOfToday).maybeSingle()
    if (led) { shouldAward = false; reason = 'Already logged today' }
    else {
      xpEarned = ruleMap['habit_complete'] ?? 5
      const streak = progress.current_streak ?? 0
      if (streak >= 60) xpEarned += ruleMap['streak_60_day_bonus'] ?? 50
      else if (streak >= 30) xpEarned += ruleMap['streak_30_day_bonus'] ?? 35
      else if (streak >= 14) xpEarned += ruleMap['streak_14_day_bonus'] ?? 20
      else if (streak >= 7) xpEarned += ruleMap['streak_7_day_bonus'] ?? 10
    }
  } else if (action === 'call_logged') {
    xpEarned = ruleMap['call_logged'] ?? 10
  } else if (action === 'demo_logged') {
    xpEarned = ruleMap['demo_logged'] ?? 25
  } else if (action === 'deal_closed') {
    xpEarned = ruleMap['deal_closed'] ?? 100
    if ((progress.total_deals ?? 0) === 0) xpEarned += ruleMap['first_deal'] ?? 250
    if ((progress.total_deals ?? 0) === 9) xpEarned += ruleMap['tenth_deal'] ?? 500
  } else if (action === 'win_logged') {
    xpEarned = ruleMap['win_logged'] ?? 15
  } else if (action === 'resource_viewed') {
    xpEarned = ruleMap['resource_viewed'] ?? 10
  } else if (action === 'drill_complete') {
    // Practice is rewarded, but capped per day to prevent farming.
    const { count } = await supabaseAdmin.from('xp_ledger').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('action', 'drill_complete').gte('created_at', startOfToday)
    if ((count ?? 0) >= 5) { shouldAward = false; reason = 'Daily drill XP cap reached' }
    else xpEarned = ruleMap['drill_complete'] ?? 15
  } else if (action === 'partner_onboarded') {
    if (!refId) return errorResponse('partner id required')
    // Awarded once per partner when their onboarding checklist hits 100%.
    const { data: led } = await supabaseAdmin.from('xp_ledger').select('id').eq('user_id', user.id).eq('action', 'partner_onboarded').eq('reference_id', refId).maybeSingle()
    if (led) { shouldAward = false; reason = 'Already awarded for this partner' }
    else xpEarned = ruleMap['partner_onboarded'] ?? 50
  } else if (action === 'module_complete') {
    if (!refId) return errorResponse('module id required')
    // Dedupe via the immutable ledger, not the mutable learning_done array — a
    // read-modify-write on that array can double-award under concurrent requests.
    const { data: led } = await supabaseAdmin.from('xp_ledger').select('id').eq('user_id', user.id).eq('action', 'module_complete').eq('reference_id', refId).maybeSingle()
    if (led) { shouldAward = false; reason = 'Already completed' }
    else xpEarned = ruleMap['module_complete'] ?? 100
  } else {
    return errorResponse(`Unknown action: ${action}`)
  }

  if (!shouldAward || xpEarned === 0) {
    return jsonResponse({ awarded: false, xp_earned: 0, reason, total_xp: progress.total_xp })
  }

  const { count } = await supabaseAdmin.from('xp_ledger').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', new Date(Date.now() - 60000).toISOString())
  if ((count ?? 0) > 20) {
    await supabaseAdmin.from('audit_logs').insert({ user_id: user.id, action: 'suspicious_activity', metadata: { action, count } })
    return jsonResponse({ awarded: false, xp_earned: 0, reason: 'Rate limit exceeded', total_xp: progress.total_xp })
  }

  const startDate = new Date(userData.start_date)
  const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / 86400000)
  const currentBelt = getBeltForDays(daysSinceStart)
  const beltAdvanced = currentBelt.rank !== progress.belt_rank

  const newTotalXp = progress.total_xp + xpEarned
  const updates: any = { total_xp: newTotalXp, belt_rank: currentBelt.rank, belt_day: daysSinceStart, days_active: daysSinceStart }

  if (action === 'call_logged') updates.total_calls = (progress.total_calls ?? 0) + 1
  if (action === 'demo_logged') updates.total_demos = (progress.total_demos ?? 0) + 1
  if (action === 'deal_closed') updates.total_deals = (progress.total_deals ?? 0) + 1
  if (action === 'lesson_complete' && refId && !(progress.completed_lessons ?? []).includes(refId)) updates.completed_lessons = [...(progress.completed_lessons ?? []), refId]
  if (action === 'module_complete' && refId) updates.learning_done = [...(progress.learning_done ?? []), refId]

  if (action === 'habit_complete') {
    const habitsToday = (progress.habits_completed_today ?? 0) + 1
    updates.habits_completed_today = habitsToday
    updates.last_habit_date = todayStr
    // A streak day = completing ALL of today's active habits (not a hardcoded 7,
    // which onboarding's 5-habit default could never reach). Count once per day.
    const { count: activeHabits } = await supabaseAdmin.from('habits').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true)
    const goal = Math.max(1, activeHabits ?? 0)
    if (habitsToday >= goal && progress.last_streak_date !== todayStr) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split('T')[0]
      const newStreak = progress.last_streak_date === yStr ? (progress.current_streak ?? 0) + 1 : 1
      updates.current_streak = newStreak
      updates.longest_streak = Math.max(newStreak, progress.longest_streak ?? 0)
      updates.last_streak_date = todayStr
    }
  }

  let beltBonusXp = 0
  if (beltAdvanced) {
    beltBonusXp = ruleMap['belt_advance'] ?? 200
    updates.total_xp = newTotalXp + beltBonusXp
    updates.last_belt_name = currentBelt.rank
    await supabaseAdmin.from('notifications').insert({ user_id: user.id, type: 'belt_advance', title: `You just earned ${currentBelt.rank}`, body: `Day ${daysSinceStart}. ${currentBelt.tagline}.`, action_url: '/home', tier: 1 })
  }

  await supabaseAdmin.from('user_progress').update(updates).eq('user_id', user.id)
  await supabaseAdmin.from('xp_ledger').insert({ user_id: user.id, action, xp_amount: xpEarned + beltBonusXp, reference_id: refId, reference_type, verified: true })
  await supabaseAdmin.from('audit_logs').insert({ user_id: user.id, action: `xp_awarded_${action}`, xp_delta: xpEarned + beltBonusXp, metadata: { ...metadata, belt_advanced: beltAdvanced } })

  return jsonResponse({ awarded: true, xp_earned: xpEarned, belt_bonus: beltBonusXp, total_xp: newTotalXp + beltBonusXp, belt: currentBelt, belt_advanced: beltAdvanced })
})
