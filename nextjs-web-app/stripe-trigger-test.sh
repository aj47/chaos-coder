#!/bin/bash

# Make the script executable first with: chmod +x stripe-trigger-test.sh
# Then run it with: ./stripe-trigger-test.sh

# This script triggers a test checkout.session.completed webhook event

# Trigger a checkout.session.completed event
echo "Triggering a checkout.session.completed event"
stripe trigger checkout.session.completed 