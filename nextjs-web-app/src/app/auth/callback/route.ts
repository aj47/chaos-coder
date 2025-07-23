import { createClient } from '@/lib/supabase/server-client'
import { NextRequest, NextResponse } from 'next/server'
import { trackAuth, captureError, ErrorCategory } from '@/lib/sentry'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      trackAuth('login', { provider: 'oauth', callback: true })
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      trackAuth('error', { provider: 'oauth', callback: true, error: error.message })
      captureError(new Error(error.message), ErrorCategory.AUTHENTICATION, {
        provider: 'oauth',
        action: 'code_exchange',
        code: code.substring(0, 10) + '...' // Only log first 10 chars for privacy
      })
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
