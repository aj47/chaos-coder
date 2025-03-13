import { NextResponse, NextRequest } from "next/server";
import { cookies } from 'next/headers';
import { AuthService } from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    // Use the AuthService to create a server client
    const cookieStore = await cookies();
    const supabase = await AuthService.createServerClient({
      getAll: () => cookieStore.getAll()
    });
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { prompt, config } = body;
    
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Insert the request into the database
    // Use any as a workaround for the TypeScript type issue with the new table
    const { data: request, error } = await (supabase as any)
      .from('generation_requests')
      .insert({
        user_id: user.id,
        prompt,
        config
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('[save-request] Failed to save request:', error);
      return NextResponse.json(
        { error: "Failed to save request", details: error.message },
        { status: 500 }
      );
    }

    // Return the request ID for redirect
    return NextResponse.json({ 
      requestId: request.id,
      success: true
    });
  } catch (error) {
    console.error('[save-request] Unexpected error:', error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
} 