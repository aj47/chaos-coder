import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import { getUserProfile } from '@/lib/database'
import { trackApiCall, captureError, ErrorCategory } from '@/lib/sentry'

export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      trackApiCall('/api/tokens/balance', 'GET', Date.now() - startTime, 401)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user profile with token balance
    const profile = await getUserProfile(user.id)
    
    if (!profile) {
      trackApiCall('/api/tokens/balance', 'GET', Date.now() - startTime, 404)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    trackApiCall('/api/tokens/balance', 'GET', Date.now() - startTime, 200)
    return NextResponse.json({
      tokenBalance: profile.token_balance,
      email: profile.email,
      fullName: profile.full_name,
    })
  } catch (error) {
    console.error('Error fetching token balance:', error)
    captureError(
      error instanceof Error ? error : new Error('Unknown token balance error'),
      ErrorCategory.API,
      { endpoint: '/api/tokens/balance' }
    )
    
    trackApiCall('/api/tokens/balance', 'GET', Date.now() - startTime, 500)
    return NextResponse.json(
      { error: 'Failed to fetch token balance' },
      { status: 500 }
    )
  }
}
