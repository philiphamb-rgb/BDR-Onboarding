// @ts-nocheck
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Token-hash auth confirmation (works across browsers / in-app mail webviews).
 *
 * Email links point here as:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/home
 *
 * Unlike the PKCE /auth/callback flow, verifyOtp does NOT require the
 * code_verifier cookie from the originating browser, so a link clicked from
 * the Gmail/Outlook mobile app verifies correctly.
 */
/**
 * Email link scanners (Microsoft 365 Safe Links, etc.) pre-fetch links with a
 * HEAD request. Next.js would otherwise run the GET handler for HEAD, which
 * would consume the one-time token before the user clicks. Answer HEAD with a
 * bare 200 so the scanner never touches verifyOtp.
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/home'

  if (token_hash && type) {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        if (!userData?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
