import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
    // refreshing the auth token
    const { data: { user } } = await supabase.auth.getUser()

    // Redirect authenticated users away from login page
    if (user && request.nextUrl.pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // EMERGENCY FIX: Manually extend cookie life if Supabase didn't refresh it
    // This catches the case where the user just logged in (fresh token) so getUser() didn't fire setAll,
    // leaving the cookie as "Session" (transient).
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
