import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthService } from '@/lib/auth';

interface TokenState {
  tokens: number;
  isLoading: boolean;
  setTokens: (tokens: number) => void;
  incrementTokens: (amount: number) => void;
  decrementTokens: (amount: number) => void;
  syncTokensWithDB: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => {
      // Remove excessive logging in production
      // console.log("Initializing token store");
      
      return {
        tokens: 0,
        isLoading: false, // Start with loading false
        
        setTokens: (tokens: number) => {
          // Reduce logging in production
          // console.log(`Setting tokens to ${tokens}`);
          // Only update if the value is different to avoid unnecessary re-renders
          if (get().tokens !== tokens) {
            set({ tokens, isLoading: false });
            // console.log('New token state:', get().tokens);
          }
        },
        
        incrementTokens: (amount: number) => {
          const current = get().tokens;
          // console.log(`Incrementing tokens by ${amount} from ${current}`);
          set({ tokens: current + amount });
          // console.log('New token state:', get().tokens);
        },
        
        decrementTokens: (amount: number) => {
          const current = get().tokens;
          // console.log(`Decrementing tokens by ${amount} from ${current}`);
          set({ tokens: Math.max(0, current - amount) });
          // console.log('New token state:', get().tokens);
        },
        
        setLoading: (isLoading: boolean) => {
          // console.log(`Setting loading state to ${isLoading}`);
          // Only update if the value is different
          if (get().isLoading !== isLoading) {
            set({ isLoading });
            // console.log('New loading state:', get().isLoading);
          }
        },
        
        // Implementation for syncTokensWithDB - it now accepts userId parameter
        syncTokensWithDB: async () => {
          // Avoid unnecessary DB calls
          if (get().tokens === 0 || get().isLoading) return;
          
          set({ isLoading: true });
          
          try {
            const supabase = AuthService.createClient();
            const { user, error } = await AuthService.getCurrentUser(supabase);
            
            if (error || !user) {
              console.error("Error getting user:", error);
              set({ isLoading: false });
              return;
            }
            
            const tokens = get().tokens;
            
            const { error: updateError } = await supabase.from("profiles").update({
              credits: tokens, // Use 'credits' instead of 'tokens' to match the database column
            }).eq("id", user.id);
            
            if (updateError) {
              console.error("Error updating tokens:", updateError);
            }
          } catch (error) {
            console.error("Error syncing tokens with DB:", error);
          } finally {
            set({ isLoading: false });
          }
        }
      };
    },
    {
      name: 'token-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist the tokens value, not the functions
      partialize: (state) => ({ tokens: state.tokens }),
    }
  )
); 