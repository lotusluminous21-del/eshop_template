import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isAuth = request.cookies.has('__session') || request.cookies.has('token');
    // Note: Firebase auth on client side doesn't automatically set cookies that middleware can read easily 
    // without a custom sync implementation or using session cookies. 
    // Standard Firebase Auth is client-side. 
    // HOWEVER, for simple client-side apps, we often just protect via client-side components.
    // But the user asked for middleware route protection.

    // Strategy: 
    // Since we are using Firebase Client SDK, the tokens are in local storage/indexedDB, not cookies.
    // Middleware runs on the server (Edge) and cannot access local storage.
    // To make middleware work, we'd need to set a cookie on login.
    // OR we can use client-side checks for everything. 
    // BUT the requirement is "Create middleware.ts for route protection".

    // Let's implement a best-effort middleware that checks for a specific cookie if we were to implement session management,
    // but primarily we might rely on client-side checks if we don't want to build a full cookie-sync system now.
    //
    // WAIT. existing `middleware.ts` was not found.
    // If we want TRUE middleware protection, we need to set a cookie.
    // 
    // ALTERNATIVE: checking for `__session` cookie is standard for Firebase Hosting + Next.js if using `firebase-admin` 
    // but we are using client sdk.

    // Let's implement a basic middleware that allows public access but restricts /admin* 
    // For now, since we haven't implemented cookie syncing, this middleware might be limited 
    // or we can implement a basic cookie set on login.

    // Let's assume for now we will rely on Client-Side protection for "smoothness" 
    // but add middleware for "hard" redirects if a cookie exists (maybe we add code to set it later).
    // OR considering the "Implementation Plan" said: "Implement NextJS middleware to check for auth tokens."

    // DECISION: I will add a cookie setter in the AuthContext or Login page to facilitate this, 
    // or I will implement the middleware to strictly define protected routes and rely on 
    // the client-side `AuthContext` to handle the actual redirect if the cookie isn't there (which might be the case initially).
    //
    // actually, for this task, adding a simple cookie on login is the easiest way to make middleware effective on refresh.
    // I'll update `AuthContext` to set a simple cookie `auth_token=true` (or similar) on login and clear on logout.
    // This is not "secure" HTTP-only auth but sufficient for UI route redirection (security is enforced by Firestore Rules / API checks).

    const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/profile');
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password');

    // We can assume if the user has a session cookie, they are logged in.
    // We'll use a cookie named 'firebase-auth-token' (a marker).
    const hasAuthCookie = request.cookies.has('firebase-auth-token');

    if (isProtected && !hasAuthCookie) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    if (isAuthPage && hasAuthCookie) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/profile/:path*', '/login', '/signup', '/forgot-password'],
};
