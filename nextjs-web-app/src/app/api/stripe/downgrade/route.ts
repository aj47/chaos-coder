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

    console.log('Downgrade requested to plan:', plan);

    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // Get user profile with subscription details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // Log full profile data for debugging
    console.log('User profile:', {
      subscription_tier: profile.subscription_tier,
      subscription_status: profile.subscription_status,
      stripe_subscription_id: profile.stripe_subscription_id,
      stripe_customer_id: profile.stripe_customer_id
    });

    // UPDATED LOGIC: Check if the user has a valid subscription to downgrade from
    const validSubscriptionTier = profile.subscription_tier && 
                                 profile.subscription_tier.toLowerCase() !== 'free';
    const validSubscriptionStatus = profile.subscription_status === 'active';
    
    if (!validSubscriptionTier || !validSubscriptionStatus) {
      console.error('No valid subscription to downgrade. Tier:', profile.subscription_tier, 'Status:', profile.subscription_status);
      return NextResponse.json({ error: 'No active subscription found to downgrade' }, { status: 400 });
    }

    // SIMPLIFIED APPROACH: Just update the subscription_tier directly
    // This field definitely exists in the schema based on the logs
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ subscription_tier: plan.toLowerCase() })
      .eq('id', user.id);
      
    if (updateError) {
      console.error('Error updating profile with downgrade:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Your plan has been downgraded to ${plan} successfully.`
    });
    
  } catch (error) {
    console.error('Error in downgrade API:', error);
    return NextResponse.json(
      { error: 'Failed to process downgrade request' },
      { status: 500 }
    );
  }
} 