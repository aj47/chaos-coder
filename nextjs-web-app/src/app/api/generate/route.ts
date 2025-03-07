import { Portkey } from "portkey-ai";
import { NextResponse, NextRequest } from "next/server";

export const runtime = "edge";

// Simple in-memory store for rate limiting (replace with Redis in production)
const submissionCounts = new Map<string, number>();

// Define Python script types/templates instead of CSS frameworks
const pythonTemplates = {
  basic: "Create a simple, well-commented Python script with basic functionality.",
  cli: "Create a command-line interface Python script with argparse for handling arguments.",
  data: "Create a data processing Python script using pandas and numpy libraries.",
  web: "Create a Python web script using Flask or FastAPI for a simple API endpoint.",
  automation: "Create a Python automation script that can handle files, scheduling, or system tasks.",
};

export async function POST(req: NextRequest) {
  // Get client IP address
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(',')[0] : "127.0.0.1";

  // Check rate limit (5 requests per IP)
  const count = submissionCounts.get(ip) || 0;
  // For debugging only
  console.log(`Rate limit check: IP ${ip} has used ${count} requests`);

  // if (count >= 25) {
  //   console.log("Rate limit exceeded for IP:", ip);
  //   return new Response(
  //     JSON.stringify({
  //       error: "rate_limit_exceeded",
  //       message: "Free limit exceeded. Please create an account to continue.",
  //     }),
  //     {
  //       status: 429,
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     }
  //   );
  // }

  // Parse the request body
  const body = await req.json();

  // Only increment count for real generations, not rate limit checks
  if (body && body.variation !== "rate-limit-check") {
    submissionCounts.set(ip, count + 1);
  }
  try {
    const { prompt, variation, scriptType } = body;

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
          // {
          //   virtual_key: "sambanova-6bc4d0",
          //   override_params: {
          //     model: "Meta-Llama-3.2-1B-Instruct",
          //   },
          // },
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

    const scriptTypeInstructions = scriptType
      ? pythonTemplates[scriptType as keyof typeof pythonTemplates]
      : pythonTemplates.basic;

    // Determine if this is an update request
    const isUpdate = body.isUpdate === true;
    const existingCode = body.existingCode || "";
    
    // New: Handle execution history for iterative development
    const executionHistory = body.executionHistory || [];
    const isIterative = executionHistory.length > 0;

    let fullPrompt;

    if (isIterative) {
      // Format the execution history for the LLM
      const formattedHistory = executionHistory.map((entry: {
        code: string;
        output?: string;
        error?: string;
        errorDetails?: {
          name?: string;
          message?: string;
          traceback?: string;
        }
      }, index: number) => {
        return `
ITERATION ${index + 1}:
CODE:
${entry.code}

EXECUTION RESULT:
${entry.output || 'No output'}
${entry.error ? `ERROR: ${entry.error}${entry.errorDetails?.traceback ? `\nTRACEBACK: ${entry.errorDetails.traceback}` : ''}` : ''}
`;
      }).join('\n');

      fullPrompt = `You are a helpful assistant that can execute python code in a Jupyter notebook. Only respond with the code to be executed and nothing else. Strip backticks in code block.

Instructions:
1. User request: ${prompt}
2. Script type: ${scriptTypeInstructions}

EXECUTION HISTORY:
${formattedHistory}

Based on the execution history above, provide the next iteration of code to execute. Consider:
1. Fix any errors from previous executions
2. Implement the next logical step based on successful executions
3. Build upon the previous code iterations

Technical Requirements:
- Return ONLY the Python script content without any explanations or markdown formatting
- The code must be complete and immediately runnable
- Focus on clean, maintainable code structure
- Format the code with proper indentation and spacing for readability

Return the COMPLETE updated Python script content:`;
    } else if (isUpdate) {
      fullPrompt = `You are a helpful assistant that can execute python code in a Jupyter notebook. Only respond with the code to be executed and nothing else. Strip backticks in code block.

Instructions:
1. Update request: ${prompt}
2. Script type: ${scriptTypeInstructions}

EXISTING CODE TO MODIFY:
${existingCode}

Technical Requirements:
- Maintain the overall structure of the existing code
- Make targeted changes based on the update request
- Keep all working functionality that isn't explicitly changed
- Ensure the script remains well-structured and maintainable
- Add clear comments for any new or modified sections

Additional Notes:
- Return the COMPLETE updated Python script content
- Do not remove existing functionality unless specifically requested
- Return ONLY the Python script content without any explanations or markdown formatting

Format the code with proper indentation and spacing for readability.`;
    } else {
      fullPrompt = `You are a helpful assistant that can execute python code in a Jupyter notebook. Only respond with the code to be executed and nothing else. Strip backticks in code block.

Instructions:
1. Base functionality: ${prompt}
2. Variation: ${variation}
3. Script type: ${scriptTypeInstructions}

Technical Requirements:
- Create a single Python script with clean, indented code structure
- Organize the code in this order:
  1. Imports at the top
  2. Constants and global variables
  3. Function and class definitions
  4. Main execution code (with if __name__ == "__main__": guard)
- Use proper Python conventions (PEP 8)
- Include clear spacing between sections
- Add descriptive docstrings and comments for each major component
- Use modern Python features (Python 3.6+)
- Keep the code modular and well-organized
- Handle errors appropriately with try/except blocks
- Include example usage in comments

Additional Notes:
- The code must be complete and immediately runnable
- Focus on clean, maintainable code structure
- Return ONLY the Python script content without any explanations or markdown formatting

Format the code with proper indentation and spacing for readability.`;
    }

    const response = await portkey.chat.completions.create({
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      max_tokens: 4096,
    });

    // Get the response content
    const content = response.choices[0]?.message?.content || "";

    // Trim out any markdown code blocks (```python, ```, etc.)
    const code = typeof content === 'string' 
      ? content.replace(/^```(?:python)?\n([\s\S]*?)```$/m, "$1").trim()
      : "";

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Error:", error);
    
    // Improved error handling
    let errorMessage = "Failed to generate code";
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = "Unserializable error object";
        errorDetails = Object.getOwnPropertyNames(error).map(prop => 
          `${prop}: ${String(error[prop as keyof typeof error])}`
        ).join(', ');
      }
    }
    
    console.error("Detailed error:", { message: errorMessage, details: errorDetails });
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
