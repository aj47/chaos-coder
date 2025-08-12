import { createClient } from '@/lib/supabase/server-client'
import { UserProfile, Subscription, UsageTracking, TokenPurchase } from '@/types/database'

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

export async function deductTokenFromUser(userId: string, tokensToDeduct: number = 1): Promise<boolean> {
  const supabase = await createClient()

  // Use the database function to safely deduct tokens
  const { data, error } = await supabase.rpc('deduct_tokens_from_user', {
    user_id_param: userId,
    tokens_to_deduct: tokensToDeduct
  })

  if (error) {
    console.error('Error deducting tokens:', error)
    return false
  }

  return data === true
}

export async function addTokensToUser(userId: string, tokensToAdd: number): Promise<boolean> {
  const supabase = await createClient()

  // Use the database function to safely add tokens
  const { data, error } = await supabase.rpc('add_tokens_to_user', {
    user_id_param: userId,
    tokens_to_add: tokensToAdd
  })

  if (error) {
    console.error('Error adding tokens:', error)
    return false
  }

  return data === true
}

export async function canUserGenerate(userId: string): Promise<{ canGenerate: boolean; reason?: string; tokensRemaining?: number }> {
  const profile = await getUserProfile(userId)

  if (!profile) {
    return { canGenerate: false, reason: 'User profile not found' }
  }

  // Check if user has tokens (each generation costs 1 token)
  const tokensRequired = 1
  if (profile.token_balance < tokensRequired) {
    return {
      canGenerate: false,
      reason: `Insufficient tokens. You need ${tokensRequired} token to generate an app. Purchase more tokens to continue.`,
      tokensRemaining: profile.token_balance
    }
  }

  return {
    canGenerate: true,
    tokensRemaining: profile.token_balance
  }
}

export async function createTokenPurchase(purchaseData: Omit<TokenPurchase, 'id' | 'created_at' | 'updated_at'>): Promise<TokenPurchase | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('token_purchases')
    .insert(purchaseData)
    .select()
    .single()

  if (error) {
    console.error('Error creating token purchase:', error)
    return null
  }

  return data
}

export async function updateTokenPurchase(paymentIntentId: string, updates: Partial<TokenPurchase>): Promise<TokenPurchase | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('token_purchases')
    .update(updates)
    .eq('stripe_payment_intent_id', paymentIntentId)
    .select()
    .single()

  if (error) {
    console.error('Error updating token purchase:', error)
    return null
  }

  return data
}

export async function getTokenPurchaseByPaymentIntent(paymentIntentId: string): Promise<TokenPurchase | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('token_purchases')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error fetching token purchase:', error)
    return null
  }

  return data || null
}
