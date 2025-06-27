# Chaos Coder

<div align="center">
  <img src="./demo.gif" alt="Chaos Coder Demo" width="640">
</div>

## Overview

Chaos Coder is a Next.js application that generates multiple variations of web applications simultaneously using AI. This tool helps developers quickly explore different implementation possibilities for their web application ideas with intelligent fallback across multiple AI providers.

**Note:** All the code for this project is located in the `nextjs-web-app` folder.

## Purpose

The purpose of Chaos Coder is to accelerate the development process by providing multiple variations of code solutions for web applications. By generating different approaches simultaneously, developers can compare and choose the best implementation for their specific needs.

## Features

- **Multi-Provider AI Generation**: Uses Portkey AI Gateway with intelligent fallbacks across Cerebras, Groq, OpenRouter, and OpenAI
- **Multiple Framework Support**: Generate apps using Tailwind CSS, Bootstrap, Materialize, PatternFly, or Pure CSS
- **Real-time Code Preview**: Live preview of generated applications in iframe
- **User Authentication**: Secure user accounts with Supabase Auth
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Theme Toggle**: Dark/light mode support
- **Code Export**: Copy and download generated code
- **Fullscreen Preview**: Dedicated fullscreen mode for testing applications

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS 4, Framer Motion
- **AI Gateway**: Portkey AI with multi-provider fallbacks
- **Authentication**: Supabase Auth with SSR
- **Deployment**: Vercel-ready configuration
- **Styling**: Tailwind CSS with custom design system

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/aj47/chaos-coder.git
cd chaos-coder/nextjs-web-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Portkey AI Gateway

Portkey serves as our AI gateway, providing intelligent fallbacks across multiple AI providers.

1. **Create a Portkey account** at [portkey.ai](https://portkey.ai)
2. **Get your Portkey API key** from the dashboard
3. **Set up Virtual Keys** for AI providers:
   - Go to the "Virtual Keys" section in your Portkey dashboard
   - Add virtual keys for the providers you want to use:
     - **Cerebras** (recommended for speed)
     - **Groq** (fast inference)
     - **OpenRouter** (wide model selection)
     - **OpenAI** (reliable fallback)
   - Note down the virtual key IDs for each provider

### 4. Set up Supabase (Optional - for authentication)

If you want user authentication features:

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Get your project credentials** from Settings > API
3. **Enable authentication providers** you want to support

### 5. Configure environment variables

Copy the example environment file and configure your settings:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual values:

```bash
# Required - Get from https://portkey.ai
PORTKEY_API_KEY=your_portkey_api_key_here

# Optional - For authentication features
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional - Use your own virtual keys (uncomment to override defaults)
# PORTKEY_CEREBRAS_VIRTUAL_KEY=your_cerebras_virtual_key
# PORTKEY_GROQ_VIRTUAL_KEY=your_groq_virtual_key
# PORTKEY_OPENROUTER_VIRTUAL_KEY=your_openrouter_virtual_key
# PORTKEY_OPENAI_VIRTUAL_KEY=your_openai_virtual_key
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

### Basic Usage

1. **Access the application** at http://localhost:3000
2. **Enter your requirements** in the prompt textarea
3. **Select number of variations** (1-5) to generate
4. **Choose a CSS framework** (optional):
   - Tailwind CSS (default)
   - Bootstrap 5
   - Materialize CSS
   - PatternFly
   - Pure CSS
5. **Click "Generate Web Apps"** to create variations
6. **Preview and interact** with generated applications
7. **Use fullscreen mode** for better testing experience
8. **Copy code** when you find a variation you like

### Advanced Features

- **Authentication**: Sign up/login to save your generations
- **Theme Toggle**: Switch between light and dark modes
- **Responsive Design**: Test on different screen sizes
- **Framework Variations**: Each generation can use different CSS frameworks
- **Intelligent Fallbacks**: If one AI provider fails, automatically tries the next

## Development

### Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Deploy (if configured)
npm run deploy
```

### Project Structure

```
nextjs-web-app/
├── src/
│   ├── app/
│   │   ├── api/generate/          # AI generation API endpoint
│   │   ├── results/               # Results page
│   │   └── signup/                # Authentication pages
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   ├── AppTile.tsx            # Generated app preview
│   │   ├── FullscreenPreview.tsx  # Fullscreen mode
│   │   └── ThemeToggle.tsx        # Theme switching
│   ├── context/
│   │   └── ThemeContext.tsx       # Theme management
│   └── lib/
│       ├── supabase/              # Supabase client setup
│       └── utils.ts               # Utility functions
├── public/                        # Static assets
└── package.json                   # Dependencies and scripts
```

## Configuration

### Environment Variables

All environment variables should be placed in `.env.local` in the `nextjs-web-app` directory:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORTKEY_API_KEY` | Yes | Your Portkey API key for AI gateway access |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL (for authentication) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key (for authentication) |
| `PORTKEY_CEREBRAS_VIRTUAL_KEY` | No | Override default Cerebras virtual key |
| `PORTKEY_GROQ_VIRTUAL_KEY` | No | Override default Groq virtual key |
| `PORTKEY_OPENROUTER_VIRTUAL_KEY` | No | Override default OpenRouter virtual key |
| `PORTKEY_OPENAI_VIRTUAL_KEY` | No | Override default OpenAI virtual key |

### AI Provider Setup

The application uses Portkey's virtual keys for AI provider management. The default configuration includes:

- **Cerebras**: Fast inference with Qwen-3-32B model
- **Groq**: High-speed inference with Llama-3.2-1B
- **OpenRouter**: Access to Gemini Flash 1.5 8B
- **OpenAI**: GPT-4o-mini as reliable fallback

To use your own providers, set the corresponding environment variables in `.env.local` (see configuration section above).

### Deployment

The application is configured for deployment on Vercel:

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - the build will automatically optimize for production

For other platforms, ensure you:
- Set all required environment variables
- Configure the build command: `npm run build`
- Set the start command: `npm start`

## Tips for Best Results

- **Be specific** in your prompts - detailed requirements lead to better generations
- **Try different frameworks** - each CSS framework offers unique design patterns
- **Use multiple variations** - compare different approaches to find the best solution
- **Test responsiveness** - use fullscreen mode to test on different screen sizes
- **Iterate** - use the update feature to refine generated applications

## Demo

Check out the demo GIF at the top of this README to see Chaos Coder in action.

## Contributing

We welcome contributions! Please see our contributing guidelines and feel free to submit issues and pull requests.

## Community

Join our Discord community for support, discussions, and updates:

[Join the Discord Server](https://discord.gg/cK9WeQ7jPq)

## License

This project is open source. See the LICENSE file for details.
