import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only allow admin routes in development
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}