#!/usr/bin/env node

/**
 * This script tests the checkout API with authentication.
 * It uses the Supabase API to get a session token and then makes a request to the checkout API.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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

// Check required variables
if (!envVars.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
  process.exit(1);
}

if (!envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local');
  process.exit(1);
}

if (!envVars.NEXT_PUBLIC_APP_URL) {
  console.error('❌ NEXT_PUBLIC_APP_URL is not set in .env.local');
  process.exit(1);
}

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];
const planType = process.argv[4] || 'pro';

if (!email || !password) {
  console.error('❌ Email and password are required');
  console.log('Usage: node scripts/test-checkout-api.js <email> <password> [planType]');
  console.log('Example: node scripts/test-checkout-api.js user@example.com password123 pro');
  process.exit(1);
}

console.log('🔄 Testing checkout API with authentication...');
console.log(`Email: ${email}`);
console.log(`Plan Type: ${planType}`);

// Sign in with Supabase
const signIn = async () => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email,
      password,
    });

    const options = {
      hostname: new URL(envVars.NEXT_PUBLIC_SUPABASE_URL).hostname,
      path: '/auth/v1/token?grant_type=password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode !== 200) {
            reject(new Error(`Authentication failed: ${JSON.stringify(parsedData)}`));
          } else {
            resolve(parsedData);
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

// Make a request to the checkout API
const createCheckoutSession = async (accessToken, refreshToken) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      planType,
    });

    const isLocalhost = envVars.NEXT_PUBLIC_APP_URL.includes('localhost');
    const httpModule = isLocalhost ? http : https;
    const options = {
      hostname: new URL(envVars.NEXT_PUBLIC_APP_URL).hostname,
      port: isLocalhost ? 3000 : undefined,
      path: '/api/create-checkout-session',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Cookie': `sb-access-token=${accessToken}; sb-refresh-token=${refreshToken}`,
      },
    };

    const req = httpModule.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode !== 200) {
            reject(new Error(`Checkout failed: ${JSON.stringify(parsedData)}`));
          } else {
            resolve(parsedData);
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

// Run the test
(async () => {
  try {
    console.log('🔄 Signing in...');
    const authData = await signIn();
    console.log('✅ Signed in successfully');

    console.log('🔄 Creating checkout session...');
    const checkoutData = await createCheckoutSession(
      authData.access_token,
      authData.refresh_token
    );
    console.log('✅ Checkout session created successfully');
    console.log('Checkout URL:', checkoutData.url);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})(); 