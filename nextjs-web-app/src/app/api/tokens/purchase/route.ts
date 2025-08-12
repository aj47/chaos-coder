import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server-client'
import { createTokenPurchase } from '@/lib/database'
import { TOKEN_PACKAGES, getTokenPackage } from '@/lib/stripe'
import { trackApiCall, captureError, ErrorCategory } from '@/lib/sentry'

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      trackApiCall('/api/tokens/purchase', 'POST', Date.now() - startTime, 401)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { packageType } = body

    if (!packageType || !['starter', 'popular', 'premium'].includes(packageType)) {
      trackApiCall('/api/tokens/purchase', 'POST', Date.now() - startTime, 400)
      return NextResponse.json(
        { error: 'Invalid package type' },
        { status: 400 }
      )
    }

    // Get package details
    const tokenPackage = getTokenPackage(packageType)
    if (!tokenPackage) {
      trackApiCall('/api/tokens/purchase', 'POST', Date.now() - startTime, 400)
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let customerId = ''
    
    // Check if user already has a customer ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Update user profile with customer ID
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create payment intent for one-time payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: tokenPackage.price * 100, // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: {
        user_id: user.id,
        package_type: packageType,
        tokens: tokenPackage.tokens.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Create token purchase record
    await createTokenPurchase({
      user_id: user.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: customerId,
      package_type: packageType as 'starter' | 'popular' | 'premium',
      tokens_purchased: tokenPackage.tokens,
      amount_paid: tokenPackage.price * 100,
      currency: 'usd',
      status: 'pending',
    })

    trackApiCall('/api/tokens/purchase', 'POST', Date.now() - startTime, 200)
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Error creating token purchase:', error)
    captureError(
      error instanceof Error ? error : new Error('Unknown token purchase error'),
      ErrorCategory.PAYMENT,
      { endpoint: '/api/tokens/purchase' }
    )
    
    trackApiCall('/api/tokens/purchase', 'POST', Date.now() - startTime, 500)
    return NextResponse.json(
      { error: 'Failed to create token purchase' },
      { status: 500 }
    )
  }
}
