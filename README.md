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

- Generates multiple unique web application variations (1-6 apps)
- Real-time code preview for each variation
- Interactive interface with theme toggling
- Voice input support for hands-free prompting
- Keyboard shortcuts for quick access to tools
- **Multiple AI Provider Support**: Choose from Portkey, OpenAI, Groq, Anthropic, local Ollama, or custom OpenAI-compatible APIs
- **Flexible Configuration**: Easy-to-use interface for switching between AI providers
- **Fallback Support**: Automatic failover between multiple AI providers

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Framer Motion
- Multiple AI Providers:
  - Portkey (Multi-provider gateway)
  - OpenAI API
  - Groq
  - Anthropic (via OpenRouter)
  - Local Ollama
  - Custom OpenAI-compatible APIs

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

### 3. Set up environment variables

Create a `.env.local` file in the project root. You can copy from `.env.example`:

```bash
cp .env.example .env.local
```

Configure at least one AI provider:

**Option 1: Portkey (Recommended - Multi-provider with fallback)**
```bash
PORTKEY_API_KEY=your_portkey_api_key_here
```

**Option 2: OpenAI Direct**
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**Option 3: Groq**
```bash
GROQ_API_KEY=your_groq_api_key_here
```

**Option 4: Anthropic via OpenRouter**
```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

**Option 5: Local Ollama**
No API key required - just ensure Ollama is running locally on port 11434.

### 4. Run the development server

```bash
npm run dev
```

## Usage

1. Access the application in your web browser at http://localhost:3000
2. **Configure AI Provider**: Click the AI configuration button to set up your preferred AI provider
3. Enter your web application requirements or ideas in the input form
4. Choose the number of variations to generate (1-6)
5. Click "Generate Web Apps" to create multiple variations
6. View and compare the different application variations
7. Use the code preview panel to inspect and edit the generated code
8. Use keyboard shortcuts for quick access to tools:
   - Shift+L: Open prompt input
   - Shift+P: Open performance metrics

### AI Provider Configuration

The application supports multiple AI providers. Click the gear icon to configure:

- **Portkey**: Multi-provider gateway with automatic fallback
- **OpenAI**: Direct OpenAI API integration
- **Groq**: Fast inference with Groq chips
- **Anthropic**: Claude models via OpenRouter
- **Local Ollama**: Use local Ollama installation
- **Custom**: Any OpenAI-compatible API endpoint

Each provider can be configured with:
- API endpoint URL
- API key (if required)
- Model selection
- Temperature and token limits

## Development

To start the development server:

```bash
npm run dev
```

To build for production:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Note

For best results, be as specific as possible when describing your application requirements. The more detailed your input, the more tailored the generated solutions will be.

## Demo

Check out the demo GIF at the top of this README to see Chaos Coder in action.

## Community

Join our Discord community for support, discussions, and updates:

[Join the Discord Server](https://discord.gg/cK9WeQ7jPq)
