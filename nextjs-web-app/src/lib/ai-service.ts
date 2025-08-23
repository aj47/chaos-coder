import { Portkey } from "portkey-ai";
import { OpenAI } from "openai";
import { AIProvider, OpenAICompatibleConfig } from "./ai-config";

export interface GenerateRequest {
  prompt: string;
  variation?: string;
  framework?: string;
  isUpdate?: boolean;
  existingCode?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResponse {
  code: string;
  provider: string;
  model: string;
}

export class AIService {
  private provider: AIProvider;
  private config: OpenAICompatibleConfig;

  constructor(provider: AIProvider, config: OpenAICompatibleConfig) {
    this.provider = provider;
    this.config = config;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const fullPrompt = this.buildPrompt(request);
    
    try {
      if (this.provider.type === 'portkey') {
        return await this.generateWithPortkey(fullPrompt, request);
      } else {
        return await this.generateWithOpenAI(fullPrompt, request);
      }
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error(`Failed to generate with ${this.provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateWithPortkey(prompt: string, request: GenerateRequest): Promise<GenerateResponse> {
    const portkeyApiKey = process.env.PORTKEY_API_KEY;
    if (!portkeyApiKey) {
      throw new Error("PORTKEY_API_KEY not configured");
    }

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

    const response = await portkey.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: request.temperature || this.config.temperature || 0.7,
      max_tokens: request.maxTokens || this.config.maxTokens || 4096,
    });

    const code = this.cleanCode(response.choices[0].message.content || "");
    
    return {
      code,
      provider: this.provider.name,
      model: "portkey-fallback",
    };
  }

  private async generateWithOpenAI(prompt: string, request: GenerateRequest): Promise<GenerateResponse> {
    const openai = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });

    const response = await openai.chat.completions.create({
      model: this.config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: request.temperature || this.config.temperature || 0.7,
      max_tokens: request.maxTokens || this.config.maxTokens || 4096,
    });

    const code = this.cleanCode(response.choices[0].message?.content || "");
    
    return {
      code,
      provider: this.provider.name,
      model: this.config.model,
    };
  }

  private buildPrompt(request: GenerateRequest): string {
    const { prompt, variation, framework, isUpdate, existingCode } = request;
    
    const frameworkPrompts = {
      tailwind: "Use Tailwind CSS for styling with modern utility classes. Include the Tailwind CDN.",
      materialize: "Use Materialize CSS framework for a Material Design look. Include the Materialize CDN.",
      bootstrap: "Use Bootstrap 5 for responsive components and layout. Include the Bootstrap CDN.",
      patternfly: "Use PatternFly for enterprise-grade UI components. Include the PatternFly CDN.",
      pure: "Use Pure CSS for minimalist, responsive design. Include the Pure CSS CDN.",
    };

    const frameworkInstructions = framework
      ? frameworkPrompts[framework as keyof typeof frameworkPrompts]
      : "";

    if (isUpdate && existingCode) {
      return `Update the following web application based on these instructions:

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
      return `Create a well-structured, modern web application based on the specific requirements below:

CORE FUNCTIONALITY REQUEST:
${prompt}

IMPORTANT: Interpret the request literally and specifically. Do not default to generic patterns like to-do lists unless explicitly requested. Be creative and think about what the user actually wants.

VARIATION INSTRUCTIONS:
${variation || ""}

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
  }

  private cleanCode(code: string): string {
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

    return code;
  }
}
