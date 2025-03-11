# Chaos Coder

<div align="center">
  <img src="./demo.gif" alt="Chaos Coder Demo" width="640">
</div>

## Overview

Chaos Coder is a Next.js application that generates five variations of web applications simultaneously using AI. This tool helps developers quickly explore different implementation possibilities for their web application ideas.

**Note:** All the code for this project is located in the `nextjs-web-app` folder.

## Purpose

The purpose of Chaos Coder is to accelerate the development process by providing multiple variations of code solutions for web applications. By generating five different approaches at once, developers can compare and choose the best implementation for their specific needs.

## Features

- Generates five unique web application variations
- Real-time code preview for each variation
- Interactive interface with theme toggling (light/dark mode)
- Voice input support for hands-free prompting
- Performance metrics for generation times
- Keyboard shortcuts for quick access to tools
- Robust user authentication with centralized AuthService
- Secure payment processing with Stripe integration
- Subscription plans (Free, Pro, Ultra) with different credit allotments
- Credit purchase system for additional generations
- User profile management with first name personalization
- Responsive design for mobile and desktop

## Tech Stack

- Next.js 15 with Turbopack
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase for authentication and database
- Stripe for payment processing
- Zod for schema validation
- Hugging Face Inference API
- Radix UI for accessible components

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- A Supabase account for authentication and database
- A Stripe account for payment processing
- A Hugging Face account for AI model access

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/aj47/chaos-coder.git
cd chaos-coder
```

### 2. Install dependencies

```bash
cd nextjs-web-app
npm install
```

### 3. Set up environment variables

Create a `.env` file in the `nextjs-web-app` directory with the following variables:

```bash
# Hugging Face API token
HF_API_TOKEN=your_huggingface_api_token

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRO_PRICE_ID=your_stripe_pro_price_id
STRIPE_ULTRA_PRICE_ID=your_stripe_ultra_price_id
STRIPE_DISCOUNT_COUPON=optional_discount_coupon_id

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: Portkey API key if using Portkey
PORTKEY_API_KEY=your_portkey_api_key
```

### 4. Supabase Setup

1. Create a new project in Supabase
2. Enable Email Auth in Authentication settings
3. Set up email templates for verification
4. Create necessary database tables by running the schema scripts:
   ```bash
   # First create the exec_sql function
   psql -h your_supabase_host -U postgres -d postgres -f db/create-exec-sql-function.sql
   
   # Then apply the schema updates
   npm run db:schema
   ```
5. Copy your project URL and anon key to the `.env` file

### 5. Stripe Setup

1. Create a Stripe account if you don't have one
2. Set up subscription products for Pro and Ultra tiers
3. Configure webhook endpoints in the Stripe dashboard
4. Add your Stripe keys to the `.env` file

### 6. Run the development server

```bash
npm run dev
```

The application will be available at http://localhost:3000 (or another port if 3000 is in use).

## Usage

1. Access the application in your web browser
2. Sign up for an account or log in if you already have one
3. View your available credits in the dashboard
4. Upgrade to a paid subscription or purchase additional credits
5. Enter your web application requirements or ideas in the input form
6. View and compare the five different application variations
7. Use the code preview panel to inspect and edit the generated code
8. Deploy your favorite variation directly from the interface

### Keyboard Shortcuts

- Shift+L: Open prompt input
- Shift+P: Open performance metrics
- Shift+T: Toggle theme (light/dark mode)

## Development

### Available Scripts

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Apply database schema updates
npm run db:schema

# Deploy (requires configuration)
npm run deploy
```

### Project Structure

```
nextjs-web-app/
├── db/               # Database scripts and schemas
├── public/           # Static assets
├── scripts/          # Utility scripts
├── src/
│   ├── app/          # Next.js app router pages
│   │   ├── api/      # API routes
│   │   │   ├── stripe/  # Payment API endpoints
│   │   │   └── ...      # Other API endpoints
│   │   ├── auth/     # Auth-related pages
│   │   └── ...       # Other pages
│   ├── components/   # Reusable UI components
│   │   ├── auth/     # Authentication components
│   │   └── ...       # Other components
│   ├── context/      # React context providers
│   ├── lib/          # Utility functions and services
│   │   ├── auth/     # Centralized authentication service
│   │   ├── payment/  # Payment processing service
│   │   └── ...       # Other utilities
│   ├── store/        # State management (Zustand)
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   └── fonts/        # Custom fonts
├── .env              # Environment variables
├── .eslintrc.json    # ESLint configuration
└── package.json      # Project dependencies and scripts
```

## Authentication System

The authentication system has been completely overhauled to use a centralized service-oriented architecture:

### AuthService

The `AuthService` class in `src/lib/auth/index.ts` provides a comprehensive API for all authentication operations:

```typescript
// Client-side authentication
const { data, error } = await AuthService.signIn(email, password);
const { data, error } = await AuthService.signUp(email, password, firstName);
const { error } = await AuthService.signOut();
const { data, error } = await AuthService.signInWithOAuth('google');

// Server-side authentication
const supabase = await AuthService.createServerClient(cookieStore);
const { user, error } = await AuthService.getCurrentUser(supabase);
```

### Features

- Unified client and server authentication
- Consistent error handling
- Session management
- OAuth integration (Google)
- User metadata management
- Type-safe database operations

## Payment System

The payment system uses Stripe for processing subscriptions and one-time purchases:

### PaymentService

The `PaymentService` class in `src/lib/payment/index.ts` handles all payment operations:

```typescript
// Create checkout sessions
const { url } = await PaymentService.createSubscriptionCheckout(customerId, 'pro', userId);
const { url } = await PaymentService.createCreditPurchaseCheckout(customerId, amount, 'pro', userId);

// Handle webhook events
const { success, message } = await PaymentService.handleWebhookEvent(body, signature, webhookSecret);

// Manage subscriptions
const { success, message } = await PaymentService.cancelSubscription(userId);
```

### Features

- Subscription management (Free, Pro, Ultra tiers)
- One-time credit purchases
- Automatic credit allocation
- Stripe webhook integration
- Secure payment processing
- Comprehensive error handling
- Transaction history

## Database Schema

The application uses a Supabase PostgreSQL database with the following key tables:

- `profiles`: User profiles and subscription information
- `credit_purchases`: Records of credit purchases
- `subscription_history`: History of subscription changes
- `credit_history`: Audit trail of credit transactions

Database functions provide secure operations for managing credits:

- `add_user_credits`: Safely add credits to a user
- `deduct_user_credits`: Safely remove credits from a user
- `reset_daily_credits`: Automatically refresh credits daily

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Community

Join our Discord community for support, discussions, and updates:

[Join the Discord Server](https://discord.gg/cK9WeQ7jPq)

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Stripe](https://stripe.com/)
- [Hugging Face](https://huggingface.co/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Zod](https://zod.dev/)
