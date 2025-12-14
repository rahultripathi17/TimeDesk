import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkAuthorization } from '@/utils/rbac-policy'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, {
                            ...options,
                            maxAge: 60 * 60 * 24 * 7, // Force 7 days persistence
                        })
                    })
                },
            },
        }
    )

    // refreshing the auth token
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Redirect authenticated users away from login page
    if (user && request.nextUrl.pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 2. Role-Based Access Control (RBAC)
    if (user) {
        // Fetch Profile Role for enforcement
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        const role = profile?.role?.toLowerCase() || 'employee'; // Default to lowest privilege

        if (!checkAuthorization(request.nextUrl.pathname, role)) {
            // Access Denied
            if (request.nextUrl.pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized: Insufficient Permissions' }, { status: 403 });
            } else {
                // Redirect to the dashboard which will route them correctly or show generic view
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }
    } else {
        // Unauthenticated User Protection
        const path = request.nextUrl.pathname;
        const protectedPrefixes = ['/dashboard', '/admin', '/hr', '/manager', '/leaves', '/policy', '/settings'];
        
        if (protectedPrefixes.some(prefix => path.startsWith(prefix))) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // EMERGENCY FIX: Manually extend cookie life if Supabase didn't refresh it
    const allCookies = request.cookies.getAll();
    allCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
            response.cookies.set({
                ...cookie, // spread first
                maxAge: 60 * 60 * 24 * 7, // Force 7 days
            });
        }
    });

    return response
}
