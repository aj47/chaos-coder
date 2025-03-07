#!/usr/bin/env node

/**
 * This script checks if the Stripe environment variables are properly set.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found. Please create it from .env.local.example');
  process.exit(1);
}

// Read .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

console.log('🔍 Checking Stripe environment variables...');

// Check required variables
const requiredVars = [
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PRO_PRICE_ID',
  'STRIPE_ULTRA_PRICE_ID',
  'NEXT_PUBLIC_APP_URL'
];

let hasErrors = false;

requiredVars.forEach(varName => {
  if (!envVars[varName]) {
    console.error(`❌ ${varName} is not set in .env.local`);
    hasErrors = true;
  } else if (envVars[varName] === `your_${varName.toLowerCase()}` || 
             envVars[varName].includes('your_') || 
             envVars[varName].includes('...')) {
    console.error(`❌ ${varName} has a placeholder value: "${envVars[varName]}"`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName} is set`);
  }
});

// Check Stripe key formats
if (envVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && 
    !envVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
  console.error('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with "pk_"');
  hasErrors = true;
}

if (envVars.STRIPE_SECRET_KEY && 
    !envVars.STRIPE_SECRET_KEY.startsWith('sk_')) {
  console.error('❌ STRIPE_SECRET_KEY should start with "sk_"');
  hasErrors = true;
}

if (envVars.STRIPE_PRO_PRICE_ID && 
    !envVars.STRIPE_PRO_PRICE_ID.startsWith('price_')) {
  console.error('❌ STRIPE_PRO_PRICE_ID should start with "price_"');
  hasErrors = true;
}

if (envVars.STRIPE_ULTRA_PRICE_ID && 
    !envVars.STRIPE_ULTRA_PRICE_ID.startsWith('price_')) {
  console.error('❌ STRIPE_ULTRA_PRICE_ID should start with "price_"');
  hasErrors = true;
}

// Check if Stripe CLI is installed
let stripeCliInstalled = false;
try {
  execSync('stripe --version', { stdio: 'ignore' });
  console.log('✅ Stripe CLI is installed');
  stripeCliInstalled = true;
} catch (error) {
  console.error('❌ Stripe CLI is not installed. Please install it from https://stripe.com/docs/stripe-cli');
  hasErrors = true;
}

if (hasErrors) {
  console.error('\n❌ There are issues with your Stripe environment setup. Please fix them before proceeding.');
  console.log('\nSee STRIPE_SETUP.md for detailed instructions on setting up Stripe for local development.');
} else {
  console.log('\n✅ All Stripe environment variables are properly set!');
  
  if (stripeCliInstalled) {
    console.log('\n🔄 To start the Stripe webhook listener, run:');
    console.log('stripe listen --forward-to http://localhost:3000/api/stripe/webhook');
  }
}

process.exit(hasErrors ? 1 : 0); 