import { NextResponse } from 'next/server';
import { HfInference } from "@huggingface/inference";

const frameworkPrompts = {
  tailwind: 'Use Tailwind CSS for styling with modern utility classes. Include the Tailwind CDN.',
  materialize: 'Use Materialize CSS framework for a Material Design look. Include the Materialize CDN.',
  bootstrap: 'Use Bootstrap 5 for responsive components and layout. Include the Bootstrap CDN.',
  Bulma: 'Use Bulma 4 for enterprise-grade UI components. Include the Bulma CDN.',
  bulma: 'Use Bulma CSS framework for a modern look. Include the Bulma CDN.',
  pure: 'Use Pure CSS for minimalist, responsive design. Include the Pure CSS CDN.'
};

const client = new HfInference(process.env.HF_API_TOKEN || "");

export async function POST(req: Request) {
  try {
    const { prompt, variation, framework, existingCode, isUpdate } = await req.json();
    
    if (!process.env.HF_API_TOKEN) {
      return NextResponse.json({ error: 'Hugging Face API token not configured' }, { status: 500 });
    }

    const frameworkInstructions = framework ? frameworkPrompts[framework as keyof typeof frameworkPrompts] : '';

    const systemPrompt = `You are an expert web developer who creates clean, semantic HTML code. 
Always respond with ONLY valid HTML code. No explanations, no markdown formatting.
Your HTML must:
1. Start with <!DOCTYPE html>
2. Include proper meta tags and charset
3. Be complete and self-contained
4. Use semantic HTML5 elements
5. Be responsive and accessible
6. Include all necessary CSS inline in a <style> tag
7. Follow modern web development best practices`;

    const userPrompt = isUpdate 
      ? `Update this HTML code according to this request while maintaining the structure and styling:

Existing code:
${existingCode}

Update request:
${prompt}

Requirements:
- Preserve the existing framework and styling
- Keep the same overall structure
- Only modify what's necessary
- Ensure the code remains complete and self-contained
- Maintain all necessary CSS and JS`
      : `Create a complete HTML page with the following requirements:
${prompt}
${variation ? `Variation: ${variation}\n` : ''}${frameworkInstructions ? `Framework: ${frameworkInstructions}\n` : ''}`;

    const chatCompletion = await client.chatCompletion({
      model: "Qwen/QwQ-32B",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      provider: "fireworks-ai",
      max_tokens: 4096
    });

    const fullResponse = chatCompletion.choices[0].message.content
      .replace(/```html\n?|\n?```/g, '') // Remove markdown code blocks
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/\\"/g, '"') // Unescape quotes
      .trim();

    return NextResponse.json({ 
      code: fullResponse,
      status: 'success'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}
