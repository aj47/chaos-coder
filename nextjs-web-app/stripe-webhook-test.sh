#!/bin/bash

# Make the script executable first with: chmod +x stripe-webhook-test.sh
# Then run it with: ./stripe-webhook-test.sh

# This script tests the Stripe webhook with the Stripe CLI

# Forward Stripe webhook events to your local server
echo "Forwarding Stripe webhook events to http://localhost:3000/api/stripe/webhook"
echo "Press Ctrl+C to stop"
stripe listen --forward-to http://localhost:3000/api/stripe/webhook 