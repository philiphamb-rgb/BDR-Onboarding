// @ts-nocheck
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Email + password sign-in, verified server-side.
 *
 * Cookies are bound to THIS response object (not the next/headers store) so the
 * Supabase session is guaranteed to be written onto the JSON response the
 * browser receives. The browser then navigates with the cookie already set,
 * so middleware sees an authenticated user instead of bouncing to /login.
 */
export async function POST(request: NextRequest) {
  let email: string | undefined
  let password: string | undefined
  try {
    const body = await request.json()
    email = body?.email
    password = body?.password
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Enter your email and password.' }, { status: 400 })
  }

  const cookiesToSet: { name: string; value: string; options: any }[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(list: any[]) {
          cookiesToSet.push(...list)
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password: String(password),
  })

  if (error) {
    return NextResponse.json({ ok: false, error: 'Incorrect email or password.' }, { status: 401 })
  }

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

  const res = NextResponse.json({ ok: true, next })
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
  return res
}
