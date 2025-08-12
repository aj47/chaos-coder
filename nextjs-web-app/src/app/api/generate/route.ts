import { Portkey } from "portkey-ai";
import { NextResponse, NextRequest } from "next/server";
import { createClient } from '@/lib/supabase/server-client'
import { canUserGenerate, deductTokenFromUser, trackUsage } from '@/lib/database'
import { trackGeneration, captureError, ErrorCategory, setSentryUser, trackApiCall } from '@/lib/sentry'
import * as Sentry from "@sentry/nextjs"

export const runtime = "edge";

// Simple in-memory store for rate limiting (replace with Redis in production)
// const submissionCounts = new Map<string, number>();

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
  const startTime = Date.now();
  let user: any = null; // Declare user outside try block

  return await Sentry.withScope(async (scope) => {
    scope.setTag('api_route', 'generate');

    try {
      // Check authentication
      const supabase = await createClient()
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      user = authUser; // Assign to outer scope variable

      if (authError || !user) {
        trackApiCall('/api/generate', 'POST', Date.now() - startTime, 401);
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Set user context for Sentry
      setSentryUser({
        id: user.id,
        email: user.email,
      });

      // Check if user can generate (has tokens)
      const { canGenerate, reason, tokensRemaining } = await canUserGenerate(user.id)
      if (!canGenerate) {
        trackApiCall('/api/generate', 'POST', Date.now() - startTime, 403);
        return NextResponse.json(
          { error: reason || 'Insufficient tokens', tokensRemaining: tokensRemaining || 0 },
          { status: 403 }
        )
      }

      const body = await req.json();
      const { prompt, variation, framework } = body;

      // Add generation context to Sentry
      scope.setContext('generation_request', {
        prompt_length: prompt?.length || 0,
        variation,
        framework,
        is_update: body.isUpdate === true,
      });

      const portkeyApiKey = process.env.PORTKEY_API_KEY;
      if (!portkeyApiKey) {
        captureError(new Error('PORTKEY_API_KEY not configured'), ErrorCategory.API);
        trackApiCall('/api/generate', 'POST', Date.now() - startTime, 500);
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
              model: "google/gemini-flash-1.5-8b",
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
      let code = response.choices?.[0]?.message?.content || "";

      // Ensure code is a string
      if (typeof code !== 'string') {
        code = '';
      }

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

      // Track successful generation
      trackGeneration({
        prompt,
        variation: variation || 0,
        framework,
        userId: user.id,
        success: true,
      });

      // Deduct token from user and track usage
      const tokenDeducted = await deductTokenFromUser(user.id, 1)
      if (!tokenDeducted) {
        console.error('Failed to deduct token from user after successful generation')
        // Still return success since generation was completed
      }
      await trackUsage(user.id, 'generation', { prompt, variation, framework, tokens_used: 1 })

      trackApiCall('/api/generate', 'POST', Date.now() - startTime, 200);
      return NextResponse.json({ code });
    } catch (error) {
      console.error("Error:", error);

      // Track failed generation
      const body = await req.json().catch(() => ({}));
      const { prompt, variation, framework } = body;

      if (prompt) {
        trackGeneration({
          prompt,
          variation: variation || 0,
          framework,
          userId: user?.id || 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Capture error with context
      captureError(
        error instanceof Error ? error : new Error('Unknown generation error'),
        ErrorCategory.GENERATION,
        {
          prompt: prompt?.substring(0, 100) + '...',
          variation,
          framework,
          userId: user?.id,
        }
      );

      trackApiCall('/api/generate', 'POST', Date.now() - startTime, 500);
      return NextResponse.json(
        { error: "Failed to generate code" },
        { status: 500 }
      );
    }
  });
}
