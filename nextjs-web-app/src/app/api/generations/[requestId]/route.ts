import { NextResponse, NextRequest } from "next/server";
import { cookies } from 'next/headers';
import { AuthService } from "@/lib/auth";
import { TypedSupabaseClient } from "@/types/supabase";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  context: { params: { requestId: string } }
) {
  // Properly await the params object
  const { requestId } = await Promise.resolve(context.params);
  
  try {
    // Use the AuthService to create a server client
    const cookieStore = await cookies();
    const supabase = await AuthService.createServerClient({
      getAll: () => cookieStore.getAll()
    }) as TypedSupabaseClient;
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // First verify the user owns this request using the awaited requestId
    const { data: request, error: requestError } = await supabase
      .from('generation_requests')
      .select('user_id')
      .eq('id', requestId)
      .single();
    
    if (requestError) {
      console.error('[generations] Failed to fetch request:', requestError);
      return NextResponse.json(
        { error: "Failed to fetch request", details: requestError.message },
        { status: 500 }
      );
    }

    if (!request) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (request.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get all generations for this request using the awaited requestId
    const { data: generations, error: generationsError } = await supabase
      .from('generations')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    
    if (generationsError) {
      console.error('[generations] Failed to fetch generations:', generationsError);
      return NextResponse.json(
        { error: "Failed to fetch generations", details: generationsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ generations: generations || [] });
  } catch (error) {
    console.error('[generations] Unexpected error:', error);
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
} 