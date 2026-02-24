import { Portkey } from "portkey-ai";
import { NextResponse, NextRequest } from "next/server";
import { cookies } from 'next/headers';
import { getStylePrompt } from "@/config/styles";
import { AuthService } from "@/lib/auth";

export const runtime = "edge";

interface DeductionResult {
  new_credits: number;
}

export async function POST(req: NextRequest) {
  try {
    // Use the AuthService to create a server client
    const cookieStore = await cookies();
    const supabase = await AuthService.createServerClient({
      getAll: () => cookieStore.getAll()
    });
    
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
        // Use `any` type here to bypass type checking for now
        const { data: existingRequest, error } = await (supabase as any)
          .from('credit_history')
          .select('id')
          .eq('user_id', user.id)
          .eq('request_id', requestId)
          .maybeSingle();
        
        if (error) {
          console.error('[Generate] Error checking for duplicate request:', error);
        } else if (existingRequest) {
          console.log('[Generate] Duplicate request detected:', requestId);
          return NextResponse.json(
            { error: "Duplicate request" },
            { status: 409 }
          );
        }
      } catch (error) {
        console.error('[Generate] Error checking for duplicate request:', error);
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

    const inceptionApiKey = process.env.INCEPTION_API_KEY;

    // Configure Portkey with Mercury 2 as primary, then fallback chain
    const portkey = new Portkey({
      apiKey: portkeyApiKey,
      config: {
        strategy: {
          mode: "fallback",
        },
        targets: [
          // Mercury 2 by Inception Labs — fast diffusion-based reasoning model
          ...(inceptionApiKey ? [{
            provider: "openai",
            api_key: inceptionApiKey,
            base_url: "https://api.inceptionlabs.ai/v1",
            override_params: {
              model: "mercury-coder",
            },
          }] : []),
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
      fullPrompt = `Update the following web application based on these instructions:\r\n\r\nInstructions:\r\n1. Update request: ${prompt}\r\n2. Style: ${styleInstructions}\r\n\r\nEXISTING CODE TO MODIFY:\r\n\`\`\`html\r\n${existingCode}\r\n\`\`\`\r\n\r\nTechnical Requirements:\r\n- IMPORTANT: Maintain a SINGLE HTML file structure with all HTML, CSS, and JavaScript\r\n- Make targeted changes based on the update request\r\n- Keep all working functionality that isn't explicitly changed\r\n- Preserve the existing styling approach and design style\r\n- Ensure all interactive elements continue to work\r\n- Add clear comments for any new or modified sections\r\n- Keep all CSS and JS inline, exactly as in the original format\r\n\r\nAdditional Notes:\r\n- Return the COMPLETE updated HTML file content\r\n- Do not remove existing functionality unless specifically requested\r\n- Do NOT split into multiple files - everything must remain in one HTML file\r\n- Ensure the code remains well-structured and maintainable\r\n- Return ONLY the HTML file content without any explanations or markdown\r\n\r\nFormat the code with proper indentation and spacing for readability.`;
    } else {
      fullPrompt = `Create a well-structured, modern web application:\r\n\r\nInstructions:\r\n1. Base functionality: ${prompt}\r\n2. Variation: ${variation}\r\n3. Style: ${styleInstructions}\r\n\r\nTechnical Requirements:\r\n- IMPORTANT: Create a SINGLE HTML file containing ALL HTML, CSS, and JavaScript\r\n- Do NOT suggest or imply separate file structures - everything must be in one HTML file\r\n- Organize the code in this exact order:\r\n  1. <!DOCTYPE html> and meta tags\r\n  2. <title> and other head elements \r\n  3. Any required CSS framework imports via CDN links\r\n  4. Custom CSS styles in a <style> tag in the head\r\n  5. HTML body with semantic markup\r\n  6. Any required JavaScript libraries via CDN links\r\n  7. Custom JavaScript in a <script> tag at the end of body\r\n- Use proper HTML5 semantic elements\r\n- Include clear spacing between sections\r\n- Add descriptive comments for each major component\r\n- Ensure responsive design with mobile-first approach\r\n- Use modern ES6+ JavaScript features\r\n- Keep the code modular and well-organized\r\n- Ensure all interactive elements have proper styling states (hover, active, etc.)\r\n- Implement the design style specified in the Style instruction\r\n\r\nAdditional Notes:\r\n- The code must be complete and immediately runnable in a browser\r\n- All custom CSS and JavaScript MUST be included inline in the single HTML file\r\n- NO separate CSS or JS files - include everything in the HTML file\r\n- Code must work properly when rendered in an iframe\r\n- Focus on clean, maintainable code structure\r\n- Return ONLY the HTML file content without any explanations or markdown\r\n\r\nFormat the code with proper indentation and spacing for readability.`;
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
        // Use a transaction to ensure atomic credit deduction
        // Use `any` type here to bypass type checking for now
        const { data, error: deductionError } = await (supabase as any).rpc(
          'deduct_generation_credit',
          { 
            user_id: user.id,
            request_id: requestId || null
          }
        );
        
        if (deductionError) {
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
