// Create product
const proProductOutput = execSync('stripe products create --name="Pro Plan" --description="Advanced features with more credits"', { encoding: 'utf8' });
const proProductId = proProductOutput.match(/id: (\w+)/)[1];
console.log(`✅ Created Pro product: ${proProductId}`);

// Create price
const proPriceOutput = execSync(`stripe prices create --product=${proProductId} --unit-amount=1000 --currency=usd --recurring-interval=month`, { encoding: 'utf8' });
const proPriceId = proPriceOutput.match(/id: (\w+)/)[1];
console.log(`✅ Created Pro price: ${proPriceId}`);

// Verify the price ID starts with "price_"
if (!proPriceId.startsWith('price_')) {
  console.error(`❌ Error: Generated price ID "${proPriceId}" does not start with "price_". This is unexpected.`);
  process.exit(1);
}

// Update .env.local with the price ID
let updatedEnvContent = envContent.replace(/STRIPE_PRO_PRICE_ID=.*/, `STRIPE_PRO_PRICE_ID=${proPriceId}`); 