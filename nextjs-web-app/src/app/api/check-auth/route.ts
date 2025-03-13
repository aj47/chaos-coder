import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { AuthService } from "@/lib/auth";
import { TypedSupabaseClient } from "@/types/supabase";

export const runtime = "edge";

export async function POST() {
  try {
    // Use the AuthService to create a server client
    const cookieStore = await cookies();
    const supabase = await AuthService.createServerClient({
      getAll: () => cookieStore.getAll()
    }) as TypedSupabaseClient;
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Check user's credits
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

    return NextResponse.json({ 
      success: true,
      credits: userProfile.credits
    });
  } catch (error) {
    console.error('[check-auth] Unexpected error:', error);
    return NextResponse.json(
      { error: "Failed to check auth status" },
      { status: 500 }
    );
  }
} 