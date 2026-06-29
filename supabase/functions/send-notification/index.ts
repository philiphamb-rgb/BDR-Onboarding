// @ts-nocheck
// send-notification — BDR OS v3: in-app notification + real Web Push.
// Self-contained (cors inlined) so it deploys as a single file. verify_jwt is
// disabled — this is invoked server-to-server with the service role.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' }
function jsonResponse(data: unknown, status = 200): Response { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
function errorResponse(message: string, status = 400): Response { return jsonResponse({ error: message }, status) }
function handleCors(req: Request): Response | null { if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders }); return null }

const DAILY_PUSH_CAP = 3

serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let body: any
  try { body = await req.json() } catch { return errorResponse('Invalid JSON') }

  const { user_id, type, title, body: msgBody, action_url, tier = 3 } = body
  if (!user_id || !type || !title || !msgBody) return errorResponse('Missing required fields', 400)

  const { data: user } = await supabase.from('users').select('notification_preferences').eq('id', user_id).single()
  const prefs = user?.notification_preferences ?? {}

  // Quiet hours: store in-app only, no push (for non-critical tiers).
  const now = new Date()
  const hour = now.getUTCHours()
  const quietStart = parseInt((prefs.quiet_hours_start ?? '21:00').split(':')[0])
  const quietEnd = parseInt((prefs.quiet_hours_end ?? '07:00').split(':')[0])
  const inQuiet = quietStart > quietEnd ? (hour >= quietStart || hour < quietEnd) : (hour >= quietStart && hour < quietEnd)
  if (inQuiet && tier >= 2) {
    await supabase.from('notifications').insert({ user_id, type, title, body: msgBody, action_url, tier })
    return jsonResponse({ status: 'queued_quiet_hours' })
  }

  // Daily push cap.
  const today = now.toISOString().split('T')[0]
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
    .eq('user_id', user_id).gte('created_at', today + 'T00:00:00')
  if ((count ?? 0) >= DAILY_PUSH_CAP && tier >= 2) {
    await supabase.from('notifications').insert({ user_id, type, title, body: msgBody, action_url, tier })
    return jsonResponse({ status: 'daily_cap_reached' })
  }

  // Always create the in-app notification record.
  await supabase.from('notifications').insert({ user_id, type, title, body: msgBody, action_url, tier })

  // Web Push — graceful no-op if VAPID isn't configured; a failed import is
  // caught so it can never break the in-app path above.
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidPublicKey = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@consumerdirect.com'

  let sent = 0
  if (vapidPrivateKey && vapidPublicKey) {
    const { data: subs } = await supabase.from('push_subscriptions')
      .select('endpoint, p256dh_key, auth_key').eq('user_id', user_id).eq('is_active', true)
    if ((subs ?? []).length) {
      try {
        const webpush = (await import('npm:web-push@3.6.7')).default
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
        const payload = JSON.stringify({ title, body: msgBody, url: action_url ?? '/home', type })
        const results = await Promise.allSettled((subs ?? []).map(async (s: any) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } },
              payload
            )
          } catch (err: any) {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await supabase.from('push_subscriptions').update({ is_active: false }).eq('endpoint', s.endpoint)
            }
            throw err
          }
        }))
        sent = results.filter((r) => r.status === 'fulfilled').length
      } catch (err) {
        console.error('[Push] send failed:', err)
      }
    }
  }

  return jsonResponse({ status: 'sent', push_count: sent })
})
