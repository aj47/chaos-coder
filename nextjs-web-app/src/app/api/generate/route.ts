import { Portkey } from "portkey-ai";
import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from "@/types/supabase";

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
  // Get client IP address
  const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
  
  // Parse the request body
  const body = await req.json();
  
  // Initialize Supabase client
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is authenticated, check their credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }
    
    // Check if user has enough credits
    if (profile && profile.credits <= 0) {
      return NextResponse.json(
        { error: "insufficient_credits", message: "You have no credits remaining. Please purchase more credits to continue." },
        { status: 402 }
      );
    }
    
    // Only deduct credits for real generations, not rate limit checks
    if (body && body.variation !== "rate-limit-check") {
      // Deduct 1 credit
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: (profile?.credits || 1) - 1 })
        .eq('id', user.id);
      
      if (updateError) {
        console.error("Error updating user credits:", updateError);
        return NextResponse.json(
          { error: "Failed to update credits" },
          { status: 500 }
        );
      }
    }
  } else {
    // User is not authenticated, use IP-based rate limiting
    // Check rate limit (25 requests per IP)
    const count = submissionCounts.get(ipAddress) || 0;
    // For debugging only
    console.log(`Rate limit check: IP ${ipAddress} has used ${count} requests`);

    if (count >= 25) {
      console.log("Rate limit exceeded for IP:", ipAddress);
      return new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          message: "Free limit exceeded. Please create an account to continue.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Only increment count for real generations, not rate limit checks
    if (body && body.variation !== "rate-limit-check") {
      submissionCounts.set(ipAddress, count + 1);
    }
  }
  
  try {
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
            virtual_key: "groq-virtual-ke-9479cd",
            override_params: {
              model: "llama-3.2-1b-preview",
            },
          },
          {
            virtual_key: "sambanova-6bc4d0",
            override_params: {
              model: "Meta-Llama-3.2-1B-Instruct",
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
      fullPrompt = `Create a well-structured, modern web application:

Instructions:
1. Base functionality: ${prompt}
2. Variation: ${variation}
3. Framework: ${frameworkInstructions}

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
    let code = response.choices[0]?.message?.content || "";

    // Trim out any markdown code blocks (```html, ```, etc.)
    if (typeof code === 'string') {
      code = code
        .replace(/^```(?:html|javascript|js)?\n([\s\S]*?)```$/m, "$1")
        .trim();
    }

    // If user is authenticated, return remaining credits
    if (user) {
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      
      return NextResponse.json({ 
        code,
        credits: updatedProfile?.credits || 0
      });
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
