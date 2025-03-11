import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';

// Disable NextJS body parsing for webhooks
export const dynamic = 'force-dynamic';
export const skipMiddleware = true;
export const maxDuration = 60;

// Buffer the raw request body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    // Get the request body as text for the Stripe signature verification
    const body = await req.text();
    
    // Get the signature from the headers
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('No Stripe signature found in webhook request');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
    // Get the webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('Stripe webhook secret is not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    // Process the webhook
    const { success, message } = await PaymentService.handleWebhookEvent(body, signature, webhookSecret);
    
    if (!success) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Unhandled webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error in webhook' },
      { status: 500 }
    );
  }
} 