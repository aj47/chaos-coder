import { Portkey } from "portkey-ai";
import { NextResponse, NextRequest } from "next/server";

export const runtime = "edge";

// Simple in-memory store for rate limiting (replace with Redis in production)
const submissionCounts = new Map<string, number>();

const frameworkPrompts = {
  tailwind:
    "Use Tailwind CSS for styling with modern utility classes. Include the Tailwind CDN.",
  materialize:
    "Use Materialize CSS framework for a Material Design look. Include the Materialize CDN.",
  bootstrap:
    "Use Bootstrap 5 for responsive components and layout. Include the Bootstrap CDN.",
  patternfly:
    "Use PatternFly for enterprise-grade UI components. Include the PatternFly CDN.",
  pure: "Use Pure CSS for minimalist, responsive design. Include the Pure CSS CDN.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, variation, framework } = body;

    const portkeyApiKey = process.env.PORTKEY_API_KEY;
    if (!portkeyApiKey) {
      return NextResponse.json(
        { error: "PORTKEY_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Configure virtual keys - use environment variables if available, otherwise use defaults
    const cerebrasVirtualKey = process.env.PORTKEY_CEREBRAS_VIRTUAL_KEY || "cerebras-b79172";
    const groqVirtualKey = process.env.PORTKEY_GROQ_VIRTUAL_KEY || "groq-virtual-ke-9479cd";
    const openrouterVirtualKey = process.env.PORTKEY_OPENROUTER_VIRTUAL_KEY || "openrouter-07e727";
    const openaiVirtualKey = process.env.PORTKEY_OPENAI_VIRTUAL_KEY || "openai-9c929c";

    // Configure Portkey with intelligent fallback across multiple AI providers
    const portkey = new Portkey({
      apiKey: portkeyApiKey,
      config: {
        strategy: {
          mode: "fallback",
        },
        targets: [
          {
            virtual_key: cerebrasVirtualKey,
            override_params: {
              model: "qwen-3-32b",
            },
          },
          {
            virtual_key: groqVirtualKey,
            override_params: {
              model: "llama-3.2-1b-preview",
            },
          },
          {
            virtual_key: openrouterVirtualKey,
            override_params: {
              model: "google/gemini-flash-1.5-8b",
            },
          },
          {
            virtual_key: openaiVirtualKey,
            override_params: {
              model: "gpt-4o-mini",
            },
          }
        ],
      },
    });

    const frameworkInstructions = framework
      ? frameworkPrompts[framework as keyof typeof frameworkPrompts]
      : "";

    // Determine if this is an update request
    const isUpdate = body.isUpdate === true;
    const existingCode = body.existingCode || "";

    let fullPrompt;

    if (isUpdate) {
      fullPrompt = `Update the following web application based on these instructions:

Instructions:
1. Update request: ${prompt}
2. Framework: ${frameworkInstructions}

EXISTING CODE TO MODIFY:
\`\`\`html
${existingCode}
\`\`\`

Technical Requirements:
- Maintain the overall structure of the existing code
- Make targeted changes based on the update request
- Keep all working functionality that isn't explicitly changed
- Preserve the existing styling approach and framework
- Ensure all interactive elements continue to work
- Add clear comments for any new or modified sections

Additional Notes:
- Return the COMPLETE updated HTML file content
- Do not remove existing functionality unless specifically requested
- Ensure the code remains well-structured and maintainable
- Return ONLY the HTML file content without any explanations

Format the code with proper indentation and spacing for readability.`;
    } else {
      fullPrompt = `Create a well-structured, modern web application based on the specific requirements below:

CORE FUNCTIONALITY REQUEST:
${prompt}

IMPORTANT: Interpret the request literally and specifically. Do not default to generic patterns like to-do lists unless explicitly requested. Be creative and think about what the user actually wants.

VARIATION INSTRUCTIONS:
${variation}

FRAMEWORK REQUIREMENTS:
${frameworkInstructions}

CREATIVE INTERPRETATION GUIDELINES:
- If the request mentions "organize" or "productivity", consider alternatives to to-do lists such as:
  * Calendar/scheduling apps
  * Dashboard with widgets
  * Time tracking applications
  * Habit tracking systems
  * Note-taking or journaling apps
  * Project management boards
  * Goal setting interfaces
- Focus on the specific domain or context mentioned in the request
- Add unique features that make the application interesting and functional
- Think about what would genuinely solve the user's stated problem

Technical Requirements:
- Create a single HTML file with clean, indented code structure
- Organize the code in this order:
  1. <!DOCTYPE html> and meta tags
  2. <title> and other head elements
  3. Framework CSS and JS imports
  4. Custom CSS styles in a <style> tag
  5. HTML body with semantic markup
  6. JavaScript in a <script> tag at the end of body
- Use proper HTML5 semantic elements
- Include clear spacing between sections
- Add descriptive comments for each major component
- Ensure responsive design with mobile-first approach
- Use modern ES6+ JavaScript features
- Keep the code modular and well-organized
- Ensure all interactive elements have proper styling states (hover, active, etc.)
- Implement the framework-specific best practices and components

Additional Notes:
- The code must be complete and immediately runnable
- All custom CSS and JavaScript should be included inline
- Code must work properly when rendered in an iframe
- Focus on clean, maintainable code structure
- Return ONLY the HTML file content without any explanations

Format the code with proper indentation and spacing for readability.`;
    }

    const response = await portkey.chat.completions.create({
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      max_tokens: 4096,
    });

    // Get the response content
    let code = response.choices[0].message.content || "";

    // Trim out any markdown code blocks (```html, ```, etc.)
    code = code
      .replace(/^```(?:html|javascript|js)?\n([\s\S]*?)```$/m, "$1")
      .trim();

    // Strip everything before the starting <html> tag (case insensitive)
    if (typeof code === 'string') {
      const htmlStartMatch = code.match(/<html[^>]*>/i);
      if (htmlStartMatch) {
        const htmlStartIndex = code.indexOf(htmlStartMatch[0]);
        code = code.substring(htmlStartIndex);
      }
    }

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }
}
