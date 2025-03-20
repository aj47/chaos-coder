import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../auth';

/**
 * Get the base credits for a given subscription tier
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
 * Service class for securely managing user credits
 */
export class CreditsService {
  /**
   * Add credits to a user's account
   */
  static async addCredits(
    userId: string, 
    amount: number, 
    type: string = 'adjustment', 
    description?: string
  ) {
    const supabase = AuthService.createClient();
    
    return await supabase.rpc('add_user_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_description: description || `Added ${amount} credits`
    });
  }
  
  /**
   * Deduct credits from a user's account
   */
  static async deductCredits(
    userId: string, 
    amount: number, 
    description?: string
  ) {
    const supabase = AuthService.createClient();
    
    return await supabase.rpc('deduct_user_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description || `Deducted ${amount} credits`
    });
  }
  
  /**
   * Get a user's current credit balance
   */
  static async getCurrentCredits(userId: string) {
    const supabase = AuthService.createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
      
    if (error) {
      throw error;
    }
    
    return data.credits;
  }
  
  /**
   * Check if a user has sufficient credits
   */
  static async hasSufficientCredits(userId: string, requiredAmount: number) {
    const currentCredits = await this.getCurrentCredits(userId);
    return currentCredits >= requiredAmount;
  }
  
  /**
   * Check if a user's credits need to be refreshed and update them if necessary
   * This is a fallback mechanism in case the scheduled job fails
   */
  static async checkAndRefreshCredits(
    userId: string
  ): Promise<{ credits: number; refreshed: boolean }> {
    const supabase = AuthService.createClient();
    
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
          // Call the secure RPC function instead of direct update
          const { data, error: rpcError } = await supabase.rpc('reset_daily_credits');
          
          if (rpcError) {
            console.error('Error resetting credits:', rpcError);
            return { credits: profile.credits, refreshed: false };
          }
          
          // Get the updated profile to return the new credit amount
          const { data: updatedProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();
            
          if (fetchError) {
            console.error('Error fetching updated profile:', fetchError);
            return { credits: profile.credits, refreshed: false };
          }
          
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
  
  /**
   * Deduct a generation credit (uses the dedicated RPC function)
   */
  static async deductGenerationCredit(userId: string, requestId?: string) {
    const supabase = AuthService.createClient();
    
    return await supabase.rpc('deduct_generation_credit', {
      user_id: userId,
      request_id: requestId
    });
  }
} 