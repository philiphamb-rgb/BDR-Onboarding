// @ts-nocheck
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Email + password sign-in via a native form POST.
 *
 * On success we issue a 303 redirect to the destination with the Supabase
 * session cookies set on the redirect response itself. The browser follows the
 * redirect as a top-level navigation and sends those cookies, so middleware
 * sees an authenticated user. This avoids the fetch/service-worker cookie
 * hand-off that was dropping the session.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData()
  const email = String(form.get('email') || '').trim().toLowerCase()
  const password = String(form.get('password') || '')

  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(path, request.url), { status: 303 })

  if (!email || !password) {
    return redirectTo('/login?error=1')
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

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return redirectTo('/login?error=1')
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

  const res = redirectTo(next)
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
  return res
}
