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
- Interactive interface with theme toggling
- Voice input support for hands-free prompting
- Keyboard shortcuts for quick access to tools

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Framer Motion
- Hugging Face Inference API

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

Create a `.env.local` file in the project root:

```bash
HF_API_TOKEN=your_huggingface_api_token
```

### 4. Run the development server

```bash
npm run dev
```

## Usage

1. Access the application in your web browser at http://localhost:3000
2. Enter your web application requirements or ideas in the input form
3. View and compare the five different application variations
4. Use the code preview panel to inspect and edit the generated code
5. Use keyboard shortcuts for quick access to tools:
   - Shift+L: Open prompt input
   - Shift+P: Open performance metrics

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
