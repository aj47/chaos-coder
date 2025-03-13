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

    // Get the request data using the awaited requestId
    const { data: request, error } = await supabase
      .from('generation_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (error) {
      console.error('[requests] Failed to fetch request:', error);
      return NextResponse.json(
        { error: "Failed to fetch request", details: error.message },
        { status: 500 }
      );
    }

    if (!request) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // Check if the user owns this request
    if (request.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error('[requests] Unexpected error:', error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
} 