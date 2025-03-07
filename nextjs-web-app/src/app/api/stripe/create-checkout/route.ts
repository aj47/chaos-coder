import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/services/stripe';
import { createServerClient } from '@/lib/supabase/server';
import { SubscriptionTier } from '@/types/supabase';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { planType } = await req.json() as { planType: SubscriptionTier };
    
    if (!planType || !['pro', 'ultra'].includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }
    
    const result = await createCheckoutSession(user.id, planType as SubscriptionTier);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 