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

    // Configure Portkey with main provider (groq) and fallback (openrouter)
    const portkey = new Portkey({
      apiKey: portkeyApiKey,
      config: {
        strategy: {
          mode: "fallback",
        },
        targets: [
          {
            virtual_key: "cerebras-b79172",
            override_params: {
              model: "qwen-3-32b",
            },
          },
          {
            virtual_key: "groq-virtual-ke-9479cd",
            override_params: {
              model: "llama-3.2-1b-preview",
            },
          },
          {
            virtual_key: "openrouter-07e727",
            override_params: {
              model: "google/gemini-2.5-flash-lite",
            },
          },
          {
            virtual_key: "openai-9c929c",
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
      fullPrompt = `Create a complete, modern single-file web app for:
${prompt}

Variation: ${variation || "Standard implementation."}
Framework/styling: ${frameworkInstructions}

Requirements:
- Interpret the request literally and build the requested domain-specific app.
- Return runnable HTML only: <!DOCTYPE html>, head, framework CDN imports if requested, inline CSS, semantic body, and inline JavaScript.
- Make it responsive, visually polished, and usable in an iframe.
- Include working interactive controls with basic accessibility states.
- Keep the code concise but complete. Do not include markdown, explanations, or text outside the HTML.`;
    }

    const response = await portkey.chat.completions.create({
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      max_tokens: 3072,
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
