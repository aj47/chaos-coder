import { Portkey } from "portkey-ai";
import { NextResponse, NextRequest } from "next/server";
import { cookies } from 'next/headers';
import { getStylePrompt } from "@/config/styles";
import { AuthService } from "@/lib/auth";
import { TypedSupabaseClient } from "@/types/supabase";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const startTime = performance.now();
  try {
    // Use the AuthService to create a server client
    const cookieStore = await cookies();
    const supabase = await AuthService.createServerClient({
      getAll: () => cookieStore.getAll()
    }) as TypedSupabaseClient;
    
    // Parse the request body
    const body = await req.json();
    // Log only the core request details without full body
    
    const { prompt, variation = '', framework, customStyle, requestId } = body;
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Check for duplicate request
    if (requestId) {
      try {
        const { data: existingGeneration } = await supabase
          .from('generations')
          .select('id')
          .eq('request_id', requestId)
          .eq('style', framework || customStyle || 'default')
          .maybeSingle();
        
        if (existingGeneration) {
          console.log('[Generate] Duplicate generation detected:', requestId);
          return NextResponse.json(
            { error: "Duplicate generation" },
            { status: 409 }
          );
        }
      } catch (error) {
        console.error('[Generate] Error checking for duplicate generation:', error);
      }
    }

    // User is authenticated, check their credits
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();
    
    if (!userProfile || userProfile.credits < 1) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }
    
    // All models now cost exactly 1 credit
    const modelCost = 1;

    // Get the style instructions from our central config
    const styleInstructions = customStyle || (framework && framework !== 'custom' 
      ? getStylePrompt(framework) 
      : '');
    
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
              model: "qwen-2.5-coder-32b",
            },
          },
          {
            virtual_key: "sambanova-6bc4d0",
            override_params: {
              model: "Qwen2.5-Coder-32B-Instruct",
            },
          },
          {
            virtual_key: "cerebras-b79172",
            override_params: {
              model: "deepseek-r1-distill-llama-70b",
            },
          },
          {
            virtual_key: "openrouter-07e727",
            override_params: {
              model: "qwen/qwen-2.5-coder-32b-instruct",
            },
          },
        ],
      },
    });

    // Determine if this is an update request
    const isUpdate = body.isUpdate === true;
    const existingCode = body.existingCode || "";

    let fullPrompt;

    if (isUpdate) {
      fullPrompt = `Update the following web application based on these instructions:

Instructions:
1. Update request: ${prompt}
2. Style: ${styleInstructions}

EXISTING CODE TO MODIFY:
\`\`\`html
${existingCode}
\`\`\`

Technical Requirements:
- IMPORTANT: Maintain a SINGLE HTML file structure with all HTML, CSS, and JavaScript
- Make targeted changes based on the update request
- Keep all working functionality that isn't explicitly changed
- Preserve the existing styling approach and design style
- Ensure all interactive elements continue to work
- Add clear comments for any new or modified sections
- Keep all CSS and JS inline, exactly as in the original format

Additional Notes:
- Return the COMPLETE updated HTML file content
- Do not remove existing functionality unless specifically requested
- Do NOT split into multiple files - everything must remain in one HTML file
- Ensure the code remains well-structured and maintainable
- Return ONLY the HTML file content without any explanations or markdown

Format the code with proper indentation and spacing for readability.`;
    } else {
      fullPrompt = `Create a well-structured, modern web application:

Instructions:
1. Base functionality: ${prompt}
2. Variation: ${variation}
3. Style: ${styleInstructions}

Technical Requirements:
- IMPORTANT: Create a SINGLE HTML file containing ALL HTML, CSS, and JavaScript
- Do NOT suggest or imply separate file structures - everything must be in one HTML file
- Organize the code in this exact order:
  1. <!DOCTYPE html> and meta tags
  2. <title> and other head elements 
  3. Any required CSS framework imports via CDN links
  4. Custom CSS styles in a <style> tag in the head
  5. HTML body with semantic markup
  6. Any required JavaScript libraries via CDN links
  7. Custom JavaScript in a <script> tag at the end of body
- Use proper HTML5 semantic elements
- Include clear spacing between sections
- Add descriptive comments for each major component
- Ensure responsive design with mobile-first approach
- Use modern ES6+ JavaScript features
- Keep the code modular and well-organized
- Ensure all interactive elements have proper styling states (hover, active, etc.)
- Implement the design style specified in the Style instruction

Additional Notes:
- The code must be complete and immediately runnable in a browser
- All custom CSS and JavaScript MUST be included inline in the single HTML file
- NO separate CSS or JS files - include everything in the HTML file
- Code must work properly when rendered in an iframe
- Focus on clean, maintainable code structure
- Return ONLY the HTML file content without any explanations or markdown

Format the code with proper indentation and spacing for readability.`;
    }

    try {
      const response = await portkey.chat.completions.create({
        messages: [{ role: "user", content: fullPrompt }],
        temperature: 0.7,
        max_tokens: 4096,
      });

      // Get the response content
      let code = response.choices[0]?.message?.content || "";

      if (!code) {
        console.error('[Generate] Empty code response from API');
        return NextResponse.json(
          { error: "Empty response from API" },
          { status: 500 }
        );
      }

      // Trim out any markdown code blocks (```html, ```, etc.)
      if (typeof code === 'string') {
        code = code
          .replace(/^```(?:html|javascript|js)?\n([\s\S]*?)```$/m, "$1")
          .trim();
      }
      
      // Trim out <think> blocks
      if (typeof code === 'string') {
        code = code.replace(/<think>([\s\S]*?)<\/think>/g, "");
      }

      try {
        // Use a transaction to ensure atomic credit deduction and generation storage
        const { data, error: deductionError } = await supabase.rpc(
          'deduct_generation_credit',
          { 
            user_id: user.id,
            request_id: requestId || null
          }
        );
        
        if (deductionError) {
          if (deductionError.message === 'Duplicate request') {
            return NextResponse.json(
              { error: "Duplicate request", details: "This generation already exists" },
              { status: 409 }
            );
          }
          console.error('[Generate] Credit deduction failed:', deductionError);
          return NextResponse.json(
            { error: "Failed to deduct credits", details: deductionError.message },
            { status: 500 }
          );
        }

        if (!data || !Array.isArray(data) || !data[0]) {
          console.error('[Generate] Credit deduction returned no result');
          return NextResponse.json(
            { error: "Failed to deduct credits", details: "No result returned" },
            { status: 500 }
          );
        }

        const newCredits = data[0].new_credits;

        // Store the generation in the database if we have a request ID
        if (requestId) {
          const { error: generationError } = await supabase
            .from('generations')
            .insert({
              request_id: requestId,
              style: framework || customStyle || 'default',
              code,
              model_type: body.modelType || 'fast',
              generation_time: (performance.now() - startTime) / 1000
            });
          
          if (generationError) {
            console.error('[Generate] Failed to store generation:', generationError);
            // Don't fail the request if storage fails, just log it
          }
        }

        return NextResponse.json({ 
          code,
          credits: newCredits,
          cost: modelCost
        });
      } catch (error) {
        console.error('[Generate] Error during credit deduction:', error);
        return NextResponse.json(
          { error: "Failed to deduct credits", details: String(error) },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('[Generate] Error during generation:', error);
      return NextResponse.json(
        { error: "Failed to generate code" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Generate] Unexpected error:', error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }
}
