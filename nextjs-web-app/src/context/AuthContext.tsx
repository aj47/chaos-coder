"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef
} from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { AuthService } from "@/lib/auth/service";

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
  
  // Create refs to track the latest values without triggering re-renders
  const userRef = useRef<User | null>(null);
  const tokensRef = useRef<number>(0);
  const pendingTokenUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when state changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

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
    if (!userRef.current) return;

    try {
      const supabase = AuthService.createClient();
      
      // Get the user's tokens from the database
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userRef.current.id)
        .single();
      
      if (error) {
        console.error("Error syncing tokens with DB:", error);
        return;
      }

      // Update local state with the database value
      if (data && data.credits !== undefined) {
        setTokens(data.credits);
      }
    } catch (error) {
      console.error("Error syncing tokens with DB:", error);
    }
  }, [setTokens]);

  // Function to update tokens in database
  const updateTokensInDB = useCallback(async () => {
    if (!userRef.current) return;
    
    try {
      const supabase = AuthService.createClient();
      
      const { error } = await supabase
        .from("profiles")
        .update({ credits: tokensRef.current })
        .eq("id", userRef.current.id);
      
      if (error) {
        console.error("Error updating tokens in DB:", error);
      }
    } catch (error) {
      console.error("Error updating tokens in DB:", error);
    }
  }, []);

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
    let isMounted = true;
    const supabase = AuthService.createClient();
    
    // Load tokens from localStorage on initialization
    const storedTokens = localStorage.getItem('user-tokens');
    if (storedTokens) {
      setTokensState(parseInt(storedTokens, 10) || 0);
    }

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn("Auth loading timed out after 5 seconds");
        setIsLoading(false);
        setUser(null);
      }
    }, 5000);

    // Check current session
    const checkUser = async () => {
      try {
        const { user, error } = await AuthService.getCurrentUser(supabase);

        if (error) {
          // Only log actual errors, not AuthSessionMissingError which is expected
          if (error instanceof Error && error.name !== 'AuthSessionMissingError') {
            console.error("AuthContext: Error fetching user:", error);
          }
          
          // For any error, clear the user state
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        
        if (user && isMounted) {
          setUser(user);
          await syncTokensWithDB();
        } else if (isMounted) {
          // No user found (not logged in)
          setUser(null);
        }
      } catch (error) {
        // This shouldn't normally happen since AuthService.getCurrentUser 
        // already handles errors, but just in case
        console.error("AuthContext: Unexpected error in checkUser:", error);
        
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        
        if (event === 'SIGNED_OUT' || !session) {
          if (isMounted) {
            setUser(null);
            setTokens(0);
            setIsLoading(false);
          }
          return;
        }

        try {
          if (isMounted) {
            setUser(session.user);
            await syncTokensWithDB();
          }
        } catch (error) {
          console.error("AuthContext: Error in auth state change:", error);
          await signOut();
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    );

    // Clean up
    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [signOut, syncTokensWithDB, isLoading]);

  // Separate effect for token updates with debouncing
  useEffect(() => {
    // Skip the initial render
    if (tokensRef.current === 0) return;
    
    // Skip if no user
    if (!userRef.current) return;
    
    // Clear any pending update
    if (pendingTokenUpdateRef.current) {
      clearTimeout(pendingTokenUpdateRef.current);
    }
    
    // Schedule new update with debounce
    pendingTokenUpdateRef.current = setTimeout(() => {
      updateTokensInDB();
      pendingTokenUpdateRef.current = null;
    }, 2000); // Longer debounce time to reduce API calls
    
    // Cleanup
    return () => {
      if (pendingTokenUpdateRef.current) {
        clearTimeout(pendingTokenUpdateRef.current);
      }
    };
  }, [tokens, updateTokensInDB]);

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
