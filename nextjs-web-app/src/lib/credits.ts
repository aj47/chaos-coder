import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get the daily credits for a given subscription tier
 */
export function getBaseCreditsForTier(tier: string): number {
  switch (tier.toLowerCase()) {
    case 'free':
      return 30;
    case 'pro':
      return 100;
    case 'ultra':
      return 1000;
    default:
      return 30; // Default to free tier
  }
}

/**
 * Check if a user's credits need to be refreshed and update them if necessary
 * This is a fallback mechanism in case the scheduled job fails
 */
export async function checkAndRefreshCredits(
  supabase: SupabaseClient,
  userId: string
): Promise<{ credits: number; refreshed: boolean }> {
  try {
    // Get the user's profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, credits, subscription_tier, last_credit_refresh')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return { credits: 0, refreshed: false };
    }

    // If the profile doesn't exist, return early
    if (!profile) {
      return { credits: 0, refreshed: false };
    }

    // Get the base credits for the user's tier
    const baseCredits = getBaseCreditsForTier(profile.subscription_tier || 'free');
    
    // Check if we need to refresh
    // Refresh if credits are below base amount OR last refresh was not today
    const shouldRefresh = 
      profile.credits < baseCredits || 
      !profile.last_credit_refresh || 
      new Date(profile.last_credit_refresh).toDateString() !== new Date().toDateString();
    
    if (shouldRefresh) {
      try {
        // Update the user's credits and refresh timestamp
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            credits: baseCredits,
            last_credit_refresh: new Date().toISOString()
          })
          .eq('id', userId)
          .select('credits')
          .single();
        
        if (updateError) {
          console.error('Error updating credits:', updateError);
          return { credits: profile.credits, refreshed: false };
        }
        
        // Add entry to credit history table for audit trail
        await supabase
          .from('credit_history')
          .insert({
            user_id: userId,
            amount: baseCredits,
            type: 'daily_reset',
            description: `Daily credit reset for ${profile.subscription_tier} tier`
          });
        
        return { 
          credits: updatedProfile.credits, 
          refreshed: true 
        };
      } catch (err) {
        console.error('Error refreshing credits:', err);
        return { credits: profile.credits, refreshed: false };
      }
    }
    
    // No refresh needed
    return { 
      credits: profile.credits, 
      refreshed: false 
    };
  } catch (err) {
    console.error('Error in checkAndRefreshCredits:', err);
    return { credits: 0, refreshed: false };
  }
} 