import { NextResponse, NextRequest } from "next/server";
import { AIService } from "@/lib/ai-service";
import { getProvider, AI_PROVIDERS, OpenAICompatibleConfig } from "@/lib/ai-config";

export const runtime = "edge";

// Simple in-memory store for rate limiting (replace with Redis in production)
const submissionCounts = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      variation,
      framework,
      isUpdate,
      existingCode,
      aiProvider = 'portkey',
      aiConfig
    } = body;

    // Get the AI provider configuration
    const provider = getProvider(aiProvider);
    if (!provider) {
      return NextResponse.json(
        { error: `Unknown AI provider: ${aiProvider}` },
        { status: 400 }
      );
    }

    // Prepare AI configuration
    let config: OpenAICompatibleConfig;

    if (provider.type === 'portkey') {
      // For Portkey, we still use the original configuration
      const portkeyApiKey = process.env.PORTKEY_API_KEY;
      if (!portkeyApiKey) {
        return NextResponse.json(
          { error: "PORTKEY_API_KEY not configured" },
          { status: 500 }
        );
      }
      config = {
        baseUrl: '',
        apiKey: portkeyApiKey,
        model: provider.defaultModel,
      };
    } else {
      // For OpenAI-compatible providers
      if (!aiConfig) {
        return NextResponse.json(
          { error: "AI configuration required for OpenAI-compatible providers" },
          { status: 400 }
        );
      }

      config = {
        baseUrl: aiConfig.baseUrl || provider.baseUrl || '',
        apiKey: aiConfig.apiKey || '',
        model: aiConfig.model || provider.defaultModel,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
      };

      // Validate required fields
      if (provider.requiresApiKey && !config.apiKey) {
        return NextResponse.json(
          { error: `API key required for ${provider.name}` },
          { status: 400 }
        );
      }

      if (!config.baseUrl) {
        return NextResponse.json(
          { error: `Base URL required for ${provider.name}` },
          { status: 400 }
        );
      }
    }

    // Create AI service instance
    const aiService = new AIService(provider, config);

    // Generate the application using the AI service
    const result = await aiService.generate({
      prompt,
      variation,
      framework,
      isUpdate,
      existingCode,
    });

    return NextResponse.json({
      code: result.code,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }
}
