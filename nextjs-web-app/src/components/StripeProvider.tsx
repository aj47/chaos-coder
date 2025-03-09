'use client';

import { ReactNode, useEffect, useState } from 'react';
import { loadStripe, Stripe as StripeType } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

interface StripeProviderProps {
  children: ReactNode;
}

// Create the actual component implementation
function StripeProviderImpl({ children }: StripeProviderProps) {
  const [stripePromise, setStripePromise] = useState<Promise<StripeType | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeStripe() {
      try {
        // Try to load the Stripe instance
        const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        
        if (!stripePublishableKey) {
          // Instead of logging to console, set an error state
          setError('Stripe is not configured. Payment features are unavailable.');
          setLoading(false);
          return;
        }
        
        const stripePromise = loadStripe(stripePublishableKey);
        setStripePromise(stripePromise);
      } catch {
        // Instead of logging to console, set an error state without using the error parameter
        setError('Failed to initialize payment system. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    initializeStripe();
  }, []);

  if (loading) {
    return <div>Loading payment system...</div>;
  }

  if (error) {
    // Display a user-friendly error or redirect
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (!stripePromise) {
    return <>{children}</>; // Just render children without Stripe if not available
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}

// Export both the default and named exports
export default StripeProviderImpl;
export const StripeProvider = StripeProviderImpl; 