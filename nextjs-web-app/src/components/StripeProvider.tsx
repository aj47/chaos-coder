'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

interface StripeContextType {
  stripe: Stripe | null;
  isLoading: boolean;
}

const StripeContext = createContext<StripeContextType>({
  stripe: null,
  isLoading: true,
});

export function useStripe() {
  return useContext(StripeContext);
}

interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeStripe = async () => {
      if (!stripe) {
        try {
          const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
          
          if (stripePublishableKey) {
            const stripeInstance = await loadStripe(stripePublishableKey);
            setStripe(stripeInstance);
          } else {
            console.error('Stripe publishable key is not configured');
          }
        } catch (error) {
          console.error('Error initializing Stripe:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeStripe();
  }, [stripe]);

  return (
    <StripeContext.Provider value={{ stripe, isLoading }}>
      {children}
    </StripeContext.Provider>
  );
} 