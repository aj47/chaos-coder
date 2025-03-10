import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TokenState {
  tokens: number;
  setTokens: (tokens: number) => void;
  incrementTokens: (amount: number) => void;
  decrementTokens: (amount: number) => void;
  syncTokensWithDB: () => Promise<void>;
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set) => ({
      tokens: 0,
      setTokens: (tokens: number) => set({ tokens }),
      incrementTokens: (amount: number) => set((state) => ({ tokens: state.tokens + amount })),
      decrementTokens: (amount: number) => set((state) => ({ tokens: Math.max(0, state.tokens - amount) })),
      
      // New function to sync tokens with database - will be implemented in components that need it
      syncTokensWithDB: async () => {
        // This is a placeholder function that components will implement
        // when they need to sync tokens with the database
        return Promise.resolve();
      }
    }),
    {
      name: 'token-storage',
      // Only persist the tokens value, not the functions
      partialize: (state) => ({ tokens: state.tokens }),
    }
  )
); 