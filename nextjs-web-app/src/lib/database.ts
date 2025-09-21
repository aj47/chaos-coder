import { createClient } from '@/lib/supabase/server-client'
import { UserProfile, Subscription, UsageTracking } from '@/types/database'

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user profile:', error)
    return null
  }

  return data
}

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error fetching user subscription:', error)
    return null
  }

  return data || null
}

export async function createOrUpdateSubscription(subscriptionData: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>): Promise<Subscription | null> {
  const supabase = await createClient()
  
  // First try to update existing subscription
  const { data: existingData, error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: subscriptionData.status,
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
      canceled_at: subscriptionData.canceled_at,
    })
    .eq('stripe_subscription_id', subscriptionData.stripe_subscription_id)
    .select()
    .single()

  if (!updateError && existingData) {
    return existingData
  }

  // If update failed, create new subscription
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subscriptionData)
    .select()
    .single()

  if (error) {
    console.error('Error creating subscription:', error)
    return null
  }

  return data
}

export async function trackUsage(userId: string, actionType: 'generation' | 'export' | 'deploy', metadata: Record<string, any> = {}): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('usage_tracking')
    .insert({
      user_id: userId,
      action_type: actionType,
      metadata
    })

  if (error) {
    console.error('Error tracking usage:', error)
    return false
  }

  return true
}

export async function incrementDailyGenerations(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  // First reset daily count if needed
  await supabase.rpc('reset_daily_generations')
  
  // Then increment the count
  const { error } = await supabase
    .from('user_profiles')
    .update({
      daily_generations_used: supabase.raw('daily_generations_used + 1')
    })
    .eq('id', userId)

  if (error) {
    console.error('Error incrementing daily generations:', error)
    return false
  }

  return true
}

export async function canUserGenerate(userId: string): Promise<{ canGenerate: boolean; reason?: string }> {
  const profile = await getUserProfile(userId)
  
  if (!profile) {
    return { canGenerate: false, reason: 'User profile not found' }
  }

  // Pro users have unlimited generations
  if (profile.subscription_plan === 'pro' && profile.subscription_status === 'active') {
    return { canGenerate: true }
  }

  // Free users have daily limits
  const today = new Date().toISOString().split('T')[0]
  const resetDate = new Date(profile.daily_generations_reset_date).toISOString().split('T')[0]
  
  // Reset count if it's a new day
  if (resetDate < today) {
    await updateUserProfile(userId, {
      daily_generations_used: 0,
      daily_generations_reset_date: today
    })
    return { canGenerate: true }
  }

  // Check if user has exceeded daily limit
  const dailyLimit = 3 // Free tier limit
  if (profile.daily_generations_used >= dailyLimit) {
    return { 
      canGenerate: false, 
      reason: `Daily limit of ${dailyLimit} generations reached. Upgrade to Pro for unlimited generations.` 
    }
  }

  return { canGenerate: true }
}
