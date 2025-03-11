"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback
} from "react";
import { AuthService } from "@/lib/auth";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

// Define the shape of our AuthContext
type AuthContextType = {
  user: User | null;
  tokens: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  setTokens: (tokens: number) => void;
  incrementTokens: (amount: number) => void;
  decrementTokens: (amount: number) => void;
  syncTokensWithDB: () => Promise<void>;
  signOut: () => Promise<void>;
};

// Create the context with a default value
export const AuthContext = createContext<AuthContextType>({
  user: null,
  tokens: 0,
  isLoading: true,
  isAuthenticated: false,
  setTokens: () => {},
  incrementTokens: () => {},
  decrementTokens: () => {},
  syncTokensWithDB: async () => {},
  signOut: async () => {},
});

// Custom hook for using the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component that wraps the app and makes auth object available to any child component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokensState] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Function to set tokens
  const setTokens = useCallback((newTokens: number) => {
    if (tokens !== newTokens) {
      setTokensState(newTokens);
      localStorage.setItem('user-tokens', newTokens.toString());
    }
  }, [tokens]);

  // Function to increment tokens
  const incrementTokens = useCallback((amount: number) => {
    const newTokens = tokens + amount;
    setTokens(newTokens);
  }, [tokens, setTokens]);

  // Function to decrement tokens
  const decrementTokens = useCallback((amount: number) => {
    const newTokens = Math.max(0, tokens - amount);
    setTokens(newTokens);
  }, [tokens, setTokens]);

  // Function to sync tokens with database
  const syncTokensWithDB = useCallback(async () => {
    if (!user || isLoading) return;

    try {
      const supabase = AuthService.createClient();
      
      // Get the user's tokens from the database
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching tokens:", error);
        return;
      }

      // Update local state with the database value
      if (data && data.credits !== undefined) {
        setTokens(data.credits);
      }
    } catch (error) {
      console.error("Error syncing tokens with DB:", error);
    }
  }, [user, isLoading, setTokens]);

  // Function to update tokens in database
  const updateTokensInDB = useCallback(async () => {
    if (!user) return;
    
    try {
      const supabase = AuthService.createClient();
      
      const { error } = await supabase
        .from("profiles")
        .update({ credits: tokens })
        .eq("id", user.id);
      
      if (error) {
        console.error("Error updating tokens in DB:", error);
      }
    } catch (error) {
      console.error("Error updating tokens in DB:", error);
    }
  }, [user, tokens]);

  // Function to sign out
  const signOut = useCallback(async () => {
    try {
      await AuthService.signOut();
      setUser(null);
      setTokens(0);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [setTokens]);

  // Effect to initialize auth state and listen for changes
  useEffect(() => {
    const supabase = AuthService.createClient();
    
    // Load tokens from localStorage on initialization
    const storedTokens = localStorage.getItem('user-tokens');
    if (storedTokens) {
      setTokensState(parseInt(storedTokens, 10) || 0);
    }

    // Check current session
    const checkUser = async () => {
      try {
        const { user, error } = await AuthService.getCurrentUser(supabase);

        if (error) {
          console.error("Error fetching user:", error);
          await signOut();
          return;
        }
        
        if (user) {
          setUser(user);
          await syncTokensWithDB();
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AuthSessionMissingError') {
          console.error("Error fetching user:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setTokens(0);
          setIsLoading(false);
          return;
        }

        try {
          setUser(session.user);
          await syncTokensWithDB();
        } catch (error) {
          console.error("Error in auth state change:", error);
          await signOut();
        } finally {
          setIsLoading(false);
        }
      }
    );

    // Update tokens in DB when tokens change
    if (user && tokens > 0) {
      updateTokensInDB();
    }

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [user, tokens, syncTokensWithDB, updateTokensInDB, signOut]);

  // The value that will be given to consumers of the context
  const value = {
    user,
    tokens,
    isLoading,
    isAuthenticated: !!user,
    setTokens,
    incrementTokens,
    decrementTokens,
    syncTokensWithDB,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 