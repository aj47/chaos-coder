#!/usr/bin/env node

/**
 * This script helps fix Stripe price ID issues by checking and updating your .env.local file.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

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

console.log('🔍 Checking Stripe price IDs...');

// Check if Stripe keys are set
if (!envVars.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set in .env.local');
  process.exit(1);
}

// Check price IDs
let hasErrors = false;
let needsUpdate = false;
let updatedEnvContent = envContent;

// Check Pro price ID
if (!envVars.STRIPE_PRO_PRICE_ID) {
  console.error('❌ STRIPE_PRO_PRICE_ID is not set in .env.local');
  hasErrors = true;
} else if (envVars.STRIPE_PRO_PRICE_ID.startsWith('prod_')) {
  console.error(`❌ STRIPE_PRO_PRICE_ID is a product ID (${envVars.STRIPE_PRO_PRICE_ID}), not a price ID`);
  console.log('   Price IDs start with "price_", not "prod_"');
  needsUpdate = true;
} else if (!envVars.STRIPE_PRO_PRICE_ID.startsWith('price_')) {
  console.error(`❌ STRIPE_PRO_PRICE_ID has invalid format: ${envVars.STRIPE_PRO_PRICE_ID}`);
  console.log('   Price IDs must start with "price_"');
  needsUpdate = true;
} else {
  console.log(`✅ STRIPE_PRO_PRICE_ID is valid: ${envVars.STRIPE_PRO_PRICE_ID}`);
}

// Check Ultra price ID
if (!envVars.STRIPE_ULTRA_PRICE_ID) {
  console.error('❌ STRIPE_ULTRA_PRICE_ID is not set in .env.local');
  hasErrors = true;
} else if (envVars.STRIPE_ULTRA_PRICE_ID.startsWith('prod_')) {
  console.error(`❌ STRIPE_ULTRA_PRICE_ID is a product ID (${envVars.STRIPE_ULTRA_PRICE_ID}), not a price ID`);
  console.log('   Price IDs start with "price_", not "prod_"');
  needsUpdate = true;
} else if (!envVars.STRIPE_ULTRA_PRICE_ID.startsWith('price_')) {
  console.error(`❌ STRIPE_ULTRA_PRICE_ID has invalid format: ${envVars.STRIPE_ULTRA_PRICE_ID}`);
  console.log('   Price IDs must start with "price_"');
  needsUpdate = true;
} else {
  console.log(`✅ STRIPE_ULTRA_PRICE_ID is valid: ${envVars.STRIPE_ULTRA_PRICE_ID}`);
}

if (needsUpdate) {
  console.log('\n🔄 Would you like to fix these issues by creating new price IDs? (y/n)');
  process.stdout.write('> ');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      try {
        // Set Stripe API key for the CLI
        process.env.STRIPE_API_KEY = envVars.STRIPE_SECRET_KEY;
        
        console.log('\n🔄 Creating new Stripe products and prices...');
        
        // Create Pro product and price
        const proProductOutput = execSync('stripe products create --name="Pro Plan" --description="Advanced features with more credits"', { encoding: 'utf8' });
        const proProductId = proProductOutput.match(/id: (\w+)/)[1];
        console.log(`✅ Created Pro product: ${proProductId}`);
        
        const proPriceOutput = execSync(`stripe prices create --product=${proProductId} --unit-amount=1000 --currency=usd --recurring-interval=month`, { encoding: 'utf8' });
        const proPriceId = proPriceOutput.match(/id: (\w+)/)[1];
        console.log(`✅ Created Pro price: ${proPriceId}`);
        
        // Create Ultra product and price
        const ultraProductOutput = execSync('stripe products create --name="Ultra Plan" --description="Premium access with unlimited features"', { encoding: 'utf8' });
        const ultraProductId = ultraProductOutput.match(/id: (\w+)/)[1];
        console.log(`✅ Created Ultra product: ${ultraProductId}`);
        
        const ultraPriceOutput = execSync(`stripe prices create --product=${ultraProductId} --unit-amount=5000 --currency=usd --recurring-interval=month`, { encoding: 'utf8' });
        const ultraPriceId = ultraPriceOutput.match(/id: (\w+)/)[1];
        console.log(`✅ Created Ultra price: ${ultraPriceId}`);
        
        // Update .env.local with the new price IDs
        updatedEnvContent = updatedEnvContent.replace(/STRIPE_PRO_PRICE_ID=.*/, `STRIPE_PRO_PRICE_ID=${proPriceId}`);
        updatedEnvContent = updatedEnvContent.replace(/STRIPE_ULTRA_PRICE_ID=.*/, `STRIPE_ULTRA_PRICE_ID=${ultraPriceId}`);
        fs.writeFileSync(envPath, updatedEnvContent);
        
        console.log('\n✅ Updated .env.local with new price IDs:');
        console.log(`STRIPE_PRO_PRICE_ID=${proPriceId}`);
        console.log(`STRIPE_ULTRA_PRICE_ID=${ultraPriceId}`);
        console.log('\n✅ Stripe price IDs fixed successfully!');
      } catch (error) {
        console.error('\n❌ Error fixing Stripe price IDs:', error.message);
        process.exit(1);
      }
    } else {
      console.log('\n❌ No changes made. Please update your .env.local file manually.');
      console.log('   Price IDs must start with "price_", not "prod_".');
      console.log('   You can find your price IDs in the Stripe Dashboard: https://dashboard.stripe.com/test/products');
    }
    
    rl.close();
  });
} else if (hasErrors) {
  console.error('\n❌ Please fix the errors in your .env.local file.');
  process.exit(1);
} else {
  console.log('\n✅ All Stripe price IDs are valid!');
} 