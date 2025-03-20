# Credit System Documentation

## Core Principles

The credit system in Chaos Coder follows strict security principles to ensure the integrity of the payment and usage model. This document outlines the rules and implementation for managing user credits.

## Credit Modification Rules

### Fundamental Rules

1. **Credits can ONLY be modified through backend API functions**
   - Direct updates to the `credits` field in the database are prohibited
   - All credit changes must go through secure RPC functions

2. **Credits can ONLY be increased through two authorized channels:**
   - **Payment system**: Via Stripe webhooks when a user purchases credits or upgrades subscription
   - **Daily refresh**: Via automated scheduled job that resets credits based on subscription tier

3. **Credits can ONLY be deducted through authorized usage channels:**
   - API endpoints that provide generation services
   - Each generation consumes a predetermined number of credits

4. **Frontend applications are NEVER allowed to increase credits**
   - Frontend may only record usage by decrementing credits
   - Any attempt to set credits higher than the database value is rejected and resynced

## Security Implementation

### Database-Level Security

1. **Row Level Security (RLS) Policies**
   - `Users can update own non-sensitive profile fields`: Prevents direct modification of the `credits` field
   - `Service role can manage all profiles`: Allows backend services to modify credits

2. **Defense-in-Depth Protection**
   - `prevent_direct_credits_update` trigger: Catches and blocks any direct credit updates
   - Audit logging: Records unauthorized modification attempts

3. **Secure Functions**
   - `add_user_credits`: Only called by payment system and scheduled refresh
   - `deduct_user_credits`: Records usage of credits
   - `reset_daily_credits`: Refreshes credits based on subscription tier
   - `deduct_generation_credit`: Atomically decrements credits for generation

### Application-Level Security

1. **CreditsService**
   - Encapsulates all credit operations
   - Enforces business rules through TypeScript
   - Provides clean interfaces for secure credit operations

2. **AuthContext**
   - Only allows decrements for usage tracking
   - Prevents frontend from increasing credits
   - Syncs with database when discrepancies are detected

## Credit Operations

### Adding Credits

Credits can be added in these scenarios only:

1. **Subscription Activation/Renewal**
   ```typescript
   // In payment webhook handler after successful subscription
   const creditsAmount = tier === "ultra" ? 1000 : tier === "pro" ? 100 : 30;
   await CreditsService.addCredits(
     userId,
     creditsAmount,
     'subscription',
     `Credits added for ${tier} subscription`
   );
   ```

2. **Credit Purchase**
   ```typescript
   // In payment webhook handler after successful credit purchase
   await CreditsService.addCredits(
     userId,
     purchaseAmount,
     'purchase',
     `Credits purchased: ${purchaseAmount}`
   );
   ```

3. **Daily Refresh**
   ```typescript
   // In scheduled job
   await supabase.rpc('reset_daily_credits');
   ```

### Deducting Credits

Credits are deducted in these scenarios:

1. **Generation Usage**
   ```typescript
   // In generation API endpoint
   await CreditsService.deductGenerationCredit(
     userId,
     requestId
   );
   ```

2. **Frontend Usage Tracking** (only decrements, never increments)
   ```typescript
   // Only if local credits are LESS than database credits
   await CreditsService.deductCredits(
     userId,
     tokensUsed,
     'Usage tracked through client interface'
   );
   ```

## Verification and Monitoring

1. **Audit Log**
   - Tracks all unauthorized attempts to modify credits
   - Available to administrators for review

2. **Credit History**
   - Records all legitimate credit operations
   - Provides audit trail of all additions and deductions

## Implementation Considerations

1. **Performance**
   - Credit operations are optimized for high concurrency
   - Atomic updates prevent race conditions

2. **Reliability**
   - Transactional operations ensure consistency
   - Error handling provides graceful degradation

## Troubleshooting

If credits are not updating correctly:

1. Check the audit log for unauthorized attempts
2. Verify credit history for expected operations
3. Ensure the frontend is properly syncing with the database
4. Validate that Stripe webhooks are functioning correctly

## Related Files

- `nextjs-web-app/src/lib/credits/index.ts`: Credit service implementation
- `nextjs-web-app/src/context/AuthContext.tsx`: Frontend credit state management
- `nextjs-web-app/src/lib/payment/index.ts`: Payment processing and Stripe integration
- `nextjs-web-app/db/schema-updates.sql`: Database schema and secure functions 