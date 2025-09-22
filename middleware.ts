import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if user is accessing admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value

    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // In production, check user level (this would need to be implemented with JWT verification)
    // For now, we'll allow access if token exists
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}