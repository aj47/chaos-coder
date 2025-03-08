import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle authentication and protected routes
 */
export async function middleware(req: NextRequest) {
  console.log("[DEBUG] Middleware running for path:", req.nextUrl.pathname);
  
  // Log all cookies to see if auth token exists
  const allCookies = req.cookies.getAll();
  console.log("[DEBUG] Request cookies:", allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`));
  
  // Check if auth token cookie exists
  const authCookie = req.cookies.get('sb-xskelhjnymrbogeloxfy-auth-token');
  console.log("[DEBUG] Auth cookie exists:", !!authCookie);
  
  if (authCookie) {
    // Check auth cookie format
    try {
      const decodedValue = decodeURIComponent(authCookie.value);
      console.log("[DEBUG] Auth cookie decoded length:", decodedValue.length);
      console.log("[DEBUG] Auth cookie format valid:", decodedValue.startsWith('[') && decodedValue.endsWith(']'));
    } catch (error) {
      console.error("[DEBUG] Error decoding auth cookie:", error);
    }
  }
  
  const res = NextResponse.next();
  
  // Create a Supabase client for the middleware - only for cookie handling
  console.log("[DEBUG] Setting up cookie handlers for auth persistence");
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get: (name) => {
          const cookie = req.cookies.get(name)?.value;
          console.log(`[DEBUG] Middleware getting cookie: ${name}, exists: ${!!cookie}`);
          
          // For auth token, try to decode if it's URL-encoded
          if (name === 'sb-xskelhjnymrbogeloxfy-auth-token' && cookie) {
            try {
              // Try to decode the cookie value if it's URL-encoded
              const decodedValue = decodeURIComponent(cookie);
              console.log(`[DEBUG] Middleware decoded auth cookie successfully`);
              return decodedValue;
            } catch (error) {
              console.error(`[DEBUG] Middleware error decoding auth cookie:`, error);
              // Return the raw value if decoding fails
              return cookie;
            }
          }
          
          return cookie;
        },
        set: (name, value, options) => {
          // This is important for session cookies to be set properly
          console.log(`[DEBUG] Middleware setting cookie: ${name}, options:`, options);
          
          // Ensure the cookie is set with the correct options for session persistence
          const cookieOptions = {
            ...options,
            // Make sure the cookie is accessible from client-side JavaScript
            httpOnly: false,
            // Set a long expiry time if not specified
            maxAge: options.maxAge || 60 * 60 * 24 * 7, // 7 days
            // Ensure the path is set to root
            path: options.path || '/',
          };
          
          // For auth token, ensure it's properly formatted before setting
          let cookieValue = value;
          if (name === 'sb-xskelhjnymrbogeloxfy-auth-token' && typeof value === 'string') {
            try {
              // Check if the value is already URL-encoded
              const decodedValue = decodeURIComponent(value);
              if (decodedValue.startsWith('[') && decodedValue.endsWith(']')) {
                console.log(`[DEBUG] Middleware: Auth cookie is already properly formatted`);
                cookieValue = value; // Keep as is
              } else if (value.startsWith('[') && value.endsWith(']')) {
                console.log(`[DEBUG] Middleware: Auth cookie needs encoding`);
                cookieValue = value; // Keep as is, will be encoded by the browser
              } else {
                console.log(`[DEBUG] Middleware: Auth cookie has unexpected format`);
              }
            } catch (error) {
              console.error(`[DEBUG] Middleware error checking auth cookie format:`, error);
            }
          }
          
          req.cookies.set({
            name,
            value: cookieValue,
            ...cookieOptions,
          });
          
          res.cookies.set({
            name,
            value: cookieValue,
            ...cookieOptions,
          });
          
          console.log(`[DEBUG] Cookie set in middleware: ${name}`);
        },
        remove: (name, options) => {
          // CRITICAL FIX: Don't remove the auth token cookie
          if (name.includes('auth-token')) {
            console.log(`[DEBUG] Middleware NOT removing auth cookie: ${name} (preserving session)`);
            return;
          }
          
          console.log(`[DEBUG] Middleware removing cookie: ${name}`);
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
  
  // Get the pathname from the URL
  const path = req.nextUrl.pathname;
  
  // Define protected routes that require authentication
  const protectedRoutes = ['/dashboard'];
  
  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    path === route || path.startsWith(`${route}/`)
  );
  
  console.log("[DEBUG] Is protected route:", isProtectedRoute);
  
  // If accessing a protected route and no auth cookie exists, redirect to login
  if (isProtectedRoute && !authCookie) {
    console.log("[DEBUG] Redirecting to login from protected route (no auth cookie)");
    // Create a new URL for the redirect
    const redirectUrl = new URL('/', req.url);
    // Add the original path as a redirect parameter
    redirectUrl.searchParams.set('redirect', path);
    // Return the redirect response
    return NextResponse.redirect(redirectUrl);
  }
  
  // Log response cookies
  console.log("[DEBUG] Response cookies:", res.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 10)}...`));
  
  return res;
}

// Only run on specific paths where authentication is needed
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}; 