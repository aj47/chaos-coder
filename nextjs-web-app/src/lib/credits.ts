import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get the max credits for a given subscription tier
 */
export function getMaxCreditsForTier(tier: string): number {
  switch (tier.toLowerCase()) {
    case 'free':
      return 5;
    case 'pro':
      return 25;
    case 'ultra':
      return 200;
    default:
      return 5; // Default to free tier
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
      .select('id, credits, subscription_tier')
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

    // Get the max credits for the user's tier
    const maxCredits = getMaxCreditsForTier(profile.subscription_tier || 'free');
    
    // Check if we need to refresh by making a separate query to check if last_credit_refresh exists
    // and if user's credits are below their tier's max
    if (profile.credits < maxCredits) {
      try {
        // Try to check last_credit_refresh if it exists
        const { data: refreshData, error: refreshError } = await supabase
          .from('profiles')
          .select('last_credit_refresh')
          .eq('id', userId)
          .single();
        
        const shouldRefresh = refreshError || // Column might not exist yet
          !refreshData?.last_credit_refresh || // Value is null
          new Date(refreshData.last_credit_refresh).toDateString() !== new Date().toDateString(); // Last refresh was not today
        
        if (shouldRefresh) {
          // Update the user's credits and attempt to set refresh timestamp
          // If last_credit_refresh doesn't exist, this will still update credits
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
              credits: maxCredits,
              ...(refreshData !== null ? { last_credit_refresh: new Date().toISOString() } : {})
            })
            .eq('id', userId)
            .select('credits')
            .single();
          
          if (updateError) {
            console.error('Error updating credits:', updateError);
            return { credits: profile.credits, refreshed: false };
          }
          
          return { 
            credits: updatedProfile.credits, 
            refreshed: true 
          };
        }
      } catch (err) {
        console.error('Error checking last_credit_refresh:', err);
        
        // Fallback: update credits anyway if they're below max
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ credits: maxCredits })
          .eq('id', userId)
          .select('credits')
          .single();
        
        if (!updateError && updatedProfile) {
          return { credits: updatedProfile.credits, refreshed: true };
        }
      }
    }
    
    // No refresh needed or possible
    return { 
      credits: profile.credits, 
      refreshed: false 
    };
  } catch (err) {
    console.error('Error in checkAndRefreshCredits:', err);
    return { credits: 0, refreshed: false };
  }
} 