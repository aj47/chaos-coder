import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/auth';

export const runtime = "edge";

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = await AuthService.createServerClient(cookieStore);
    const { user, error } = await AuthService.getCurrentUser(supabase);

    if (error || !user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({ 
      authenticated: true, 
      userId: user.id 
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking auth:', error);
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Failed to check authentication status' 
    }, { status: 500 });
  }
} 