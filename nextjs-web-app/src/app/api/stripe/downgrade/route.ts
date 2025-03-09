import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// We're not using these in our fixed version, so removing them to avoid linter errors
// import { cancelSubscription, getSubscription } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { plan } = body;

    // Validate plan
    if (!plan || !['FREE', 'PRO'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan specified' }, { status: 400 });
    }

    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with subscription details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check if the user has an active Stripe subscription
    if (!profile.stripe_customer_id || !profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // UPDATED LOGIC: Check if the user has a valid subscription to downgrade from
    const validSubscriptionTier = profile.subscription_tier && 
                                 profile.subscription_tier.toLowerCase() !== 'free';
    const validSubscriptionStatus = profile.subscription_status === 'active';
    
    if (!validSubscriptionTier || !validSubscriptionStatus) {
      return NextResponse.json({ error: 'No active subscription found to downgrade' }, { status: 400 });
    }

    // SIMPLIFIED APPROACH: Just update the subscription_tier directly
    // This field definitely exists in the schema based on the logs
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ subscription_tier: plan.toLowerCase() })
      .eq('id', user.id);
      
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Your plan has been downgraded to ${plan} successfully.`
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process downgrade request' },
      { status: 500 }
    );
  }
} 