# Chaos Coder - Next.js Web App

This is the Next.js web application for Chaos Coder, a tool that generates five variations of web applications simultaneously using AI.

## Features

- Generate five unique web application variations
- Real-time code preview for each variation
- Interactive interface with theme toggling (light/dark mode)
- Voice input support for hands-free prompting
- Performance metrics for generation times
- User authentication with Supabase
- User profile management with first name personalization
- Responsive design for mobile and desktop

## Tech Stack

- Next.js 15 with Turbopack
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase for authentication and user management
- Hugging Face Inference API
- Radix UI for accessible components

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- A Supabase account for authentication
- A Hugging Face account for AI model access

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/aj47/chaos-coder.git
cd chaos-coder/nextjs-web-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then edit the `.env` file with your own values:

```
# Hugging Face API token
HF_API_TOKEN=your_huggingface_api_token

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Portkey API key if using Portkey
PORTKEY_API_KEY=your_portkey_api_key
```

### 4. Supabase Setup

1. Create a new project in Supabase
2. Enable Email Auth in Authentication settings
3. Set up email templates for verification
4. Run the SQL migrations in `supabase/migrations` to set up the database schema
5. Copy your project URL and anon key to the `.env` file

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
nextjs-web-app/
├── public/            # Static assets
├── src/
│   ├── app/           # Next.js app router pages
│   ├── components/    # Reusable UI components
│   ├── context/       # React context providers
│   ├── lib/           # Utility functions and services
│   │   └── supabase/  # Supabase client configuration
│   ├── services/      # External service integrations
│   ├── types/         # TypeScript type definitions
│   └── fonts/         # Custom fonts
├── supabase/          # Supabase configuration and migrations
├── .env               # Environment variables
└── package.json       # Project dependencies and scripts
```

## Authentication Flow

1. Users sign up with email, password, and first name
2. Email verification is sent to the user
3. After verification, users are redirected to the dashboard
4. User information, including first name, is stored in Supabase
5. The dashboard displays personalized content based on the user's profile

## Available Scripts

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Deploy (requires configuration)
npm run deploy
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [Hugging Face Documentation](https://huggingface.co/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Documentation

- [Database Schema](./docs/DATABASE.md) - Comprehensive documentation of the database schema, including tables, relationships, and access patterns.
```
