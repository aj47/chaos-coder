import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Checking environment variables');
    
    // Check Stripe environment variables
    const stripeEnv = {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set',
      STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID ? 'Set' : 'Not set',
      STRIPE_ULTRA_PRICE_ID: process.env.STRIPE_ULTRA_PRICE_ID ? 'Set' : 'Not set',
      STRIPE_PRO_PRODUCT_ID: process.env.STRIPE_PRO_PRODUCT_ID ? 'Set' : 'Not set',
      STRIPE_ULTRA_PRODUCT_ID: process.env.STRIPE_ULTRA_PRODUCT_ID ? 'Set' : 'Not set',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Not set',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'Not set',
    };
    
    console.log('📊 Stripe environment variables:', stripeEnv);
    
    // Check Supabase environment variables
    const supabaseEnv = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
    };
    
    console.log('📊 Supabase environment variables:', supabaseEnv);
    
    // Return a sanitized version (without actual values)
    return NextResponse.json({
      stripe: stripeEnv,
      supabase: supabaseEnv,
      message: 'Environment variables checked'
    });
  } catch (error) {
    console.error('❌ Error checking environment variables:', error);
    return NextResponse.json({ error: 'Failed to check environment variables' }, { status: 500 });
  }
} 