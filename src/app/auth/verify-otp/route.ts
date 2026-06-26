// @ts-nocheck
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side OTP code verification.
 *
 * Verifying the email code here (rather than in the browser) guarantees the
 * Supabase session cookies are written onto this response, so the very next
 * navigation to /home is already authenticated. The previous browser-side
 * verifyOtp succeeded but the cookie wasn't reliably available to middleware
 * before the redirect, bouncing the user back to the sign-in screen.
 */
export async function POST(request: NextRequest) {
  let email: string | undefined
  let token: string | undefined

  try {
    const body = await request.json()
    email = body?.email
    token = body?.token
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 })
  }

  if (!email || !token) {
    return NextResponse.json({ ok: false, error: 'Missing email or code' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    email: String(email).trim().toLowerCase(),
    token: String(token).trim(),
    type: 'email',
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 401 })
  }

  // Route first-timers through onboarding, everyone else to home.
  let next = '/home'
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()
    if (!userData?.onboarding_completed) next = '/onboarding'
  }

  return NextResponse.json({ ok: true, next })
}
