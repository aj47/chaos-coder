import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import { getUserProfile, getUserSubscription } from '@/lib/database'

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user profile and subscription
    const userProfile = await getUserProfile(user.id)
    const subscription = await getUserSubscription(user.id)

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      subscription_status: userProfile.subscription_status,
      subscription_plan: userProfile.subscription_plan,
      daily_generations_used: userProfile.daily_generations_used,
      daily_generations_reset_date: userProfile.daily_generations_reset_date,
      subscription: subscription ? {
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        status: subscription.status,
      } : null,
    })
  } catch (error) {
    console.error('Error fetching subscription status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}
