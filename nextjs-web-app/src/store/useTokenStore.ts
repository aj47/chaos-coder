import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TokenState {
  tokens: number;
  setTokens: (tokens: number) => void;
  incrementTokens: (amount: number) => void;
  decrementTokens: (amount: number) => void;
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set) => ({
      tokens: 0,
      setTokens: (tokens: number) => set({ tokens }),
      incrementTokens: (amount: number) => set((state) => ({ tokens: state.tokens + amount })),
      decrementTokens: (amount: number) => set((state) => ({ tokens: Math.max(0, state.tokens - amount) })),
    }),
    {
      name: 'token-storage',
    }
  )
); 