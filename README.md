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

# Optional: Portkey API key if using Portkey
PORTKEY_API_KEY=your_portkey_api_key
```

### 4. Supabase Setup

1. Create a new project in Supabase
2. Enable Email Auth in Authentication settings
3. Set up email templates for verification
4. Create necessary tables for user data (if needed)
5. Copy your project URL and anon key to the `.env` file

### 5. Run the development server

```bash
npm run dev
```

The application will be available at http://localhost:3000 (or another port if 3000 is in use).

## Usage

1. Access the application in your web browser
2. Sign up for an account or log in if you already have one
3. Enter your web application requirements or ideas in the input form
4. View and compare the five different application variations
5. Use the code preview panel to inspect and edit the generated code
6. Deploy your favorite variation directly from the interface

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

# Deploy (requires configuration)
npm run deploy
```

### Project Structure

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
│   └── fonts/         # Custom fonts
├── .env               # Environment variables
└── package.json       # Project dependencies and scripts
```

## Authentication Flow

1. Users sign up with email, password, and first name
2. Email verification is sent to the user
3. After verification, users are redirected to the dashboard
4. User information, including first name, is stored in Supabase
5. The dashboard displays personalized content based on the user's profile

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
- [Hugging Face](https://huggingface.co/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
