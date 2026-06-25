// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const DAILY_PUSH_CAP = 3

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { user_id, type, title, body, action_url, tier = 3, override_quiet_hours = false } = await req.json()

    if (!user_id || !type || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch user notification preferences
    const { data: user } = await supabase
      .from('users')
      .select('notification_preferences')
      .eq('id', user_id)
      .single()

    const prefs = user?.notification_preferences ?? {}

    // Check quiet hours (unless overridden)
    if (!override_quiet_hours) {
      const now = new Date()
      const hour = now.getUTCHours()
      const quietStart = parseInt((prefs.quiet_hours_start ?? '21:00').split(':')[0])
      const quietEnd   = parseInt((prefs.quiet_hours_end   ?? '07:00').split(':')[0])

      const inQuietHours = quietStart > quietEnd
        ? (hour >= quietStart || hour < quietEnd)   // crosses midnight
        : (hour >= quietStart && hour < quietEnd)

      if (inQuietHours && tier >= 2) {
        // Store as in-app notification only during quiet hours
        await supabase.from('notifications').insert({ user_id, type, title, body, action_url, tier })
        return new Response(JSON.stringify({ status: 'queued_quiet_hours' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Check daily push cap
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', today + 'T00:00:00')

    if ((count ?? 0) >= DAILY_PUSH_CAP && tier >= 2) {
      // Store but don't push
      await supabase.from('notifications').insert({ user_id, type, title, body, action_url, tier })
      return new Response(JSON.stringify({ status: 'daily_cap_reached' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create in-app notification record
    await supabase.from('notifications').insert({ user_id, type, title, body, action_url, tier })

    // Get push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh_key, auth_key')
      .eq('user_id', user_id)
      .eq('is_active', true)

    // Send push notifications
    const pushResults = await Promise.allSettled(
      (subscriptions ?? []).map(async (sub) => {
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
        const vapidPublicKey  = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        const vapidSubject    = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@consumerdirect.com'

        if (!vapidPrivateKey || !vapidPublicKey) return

        // For now, log that push would be sent
        // Full web-push implementation requires additional crypto setup in Deno
        console.log('[Push] Would send to:', sub.endpoint.slice(-20))
      })
    )

    return new Response(
      JSON.stringify({ status: 'sent', push_count: pushResults.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('send-notification error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
