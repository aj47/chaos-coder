import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupabaseClient } from '@supabase/supabase-js';

interface TokenState {
  tokens: number;
  isLoading: boolean;
  setTokens: (tokens: number) => void;
  incrementTokens: (amount: number) => void;
  decrementTokens: (amount: number) => void;
  syncTokensWithDB: (userId: string) => Promise<void>;
  setLoading: (isLoading: boolean) => void;
}

// Initialize a Supabase client - will be properly initialized in syncTokensWithDB
let supabaseClient: SupabaseClient | null = null;

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => {
      // Log initial state
      console.log("Initializing token store");
      
      return {
        tokens: 0,
        isLoading: false, // Start with loading false
        
        setTokens: (tokens: number) => {
          console.log(`Setting tokens to ${tokens}`);
          // Only update if the value is different to avoid unnecessary re-renders
          if (get().tokens !== tokens) {
            set({ tokens, isLoading: false });
            console.log('New token state:', get().tokens);
          }
        },
        
        incrementTokens: (amount: number) => {
          const current = get().tokens;
          console.log(`Incrementing tokens by ${amount} from ${current}`);
          set({ tokens: current + amount });
          console.log('New token state:', get().tokens);
        },
        
        decrementTokens: (amount: number) => {
          const current = get().tokens;
          console.log(`Decrementing tokens by ${amount} from ${current}`);
          set({ tokens: Math.max(0, current - amount) });
          console.log('New token state:', get().tokens);
        },
        
        setLoading: (isLoading: boolean) => {
          console.log(`Setting loading state to ${isLoading}`);
          // Only update if the value is different
          if (get().isLoading !== isLoading) {
            set({ isLoading });
            console.log('New loading state:', get().isLoading);
          }
        },
        
        // Implementation for syncTokensWithDB - it now accepts userId parameter
        syncTokensWithDB: async (userId: string) => {
          console.log(`syncTokensWithDB called for user ${userId}`);
          console.log(`Current state before sync: tokens=${get().tokens}, isLoading=${get().isLoading}`);
          
          // Only set loading to true if it's not already loading
          if (!get().isLoading) {
            set({ isLoading: true });
            console.log('Set loading to true');
          }
          
          try {
            console.log("Syncing tokens with database for user:", userId);
            // Dynamically import the client to avoid SSR issues
            if (!supabaseClient) {
              const { createClient } = await import('@/lib/supabase/client');
              supabaseClient = createClient();
              console.log('Created Supabase client');
            }
            
            const { data, error } = await supabaseClient
              .from('profiles')
              .select('credits')
              .eq('id', userId)
              .single();
            
            if (error) {
              console.error('Error syncing tokens with DB:', error);
              set({ isLoading: false });
              console.log('Set loading to false due to error');
              return;
            }
            
            if (data && data.credits !== undefined) {
              console.log('Synced tokens from DB:', data.credits);
              // Only update if the value is different
              if (get().tokens !== data.credits) {
                set({ tokens: data.credits, isLoading: false });
                console.log(`Updated tokens to ${data.credits} and set loading to false`);
              } else {
                // Just update loading state if tokens didn't change
                set({ isLoading: false });
                console.log('Tokens unchanged, just set loading to false');
              }
            } else {
              console.warn('No credits data found in DB');
              set({ isLoading: false });
              console.log('Set loading to false due to no data');
            }
          } catch (error) {
            console.error('Exception in syncTokensWithDB:', error);
            set({ isLoading: false });
            console.log('Set loading to false due to exception');
          }
          
          console.log(`Final state after sync: tokens=${get().tokens}, isLoading=${get().isLoading}`);
        }
      };
    },
    {
      name: 'token-storage',
      // Only persist the tokens value, not the functions
      partialize: (state) => ({ tokens: state.tokens }),
    }
  )
); 