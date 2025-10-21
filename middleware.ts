import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // partner.danchemoim.com 서브도메인에서 루트(/) 접속 시 /partner/dashboard로 리다이렉트
  if (hostname.includes('partner.danchemoim.com') && pathname === '/') {
    return NextResponse.redirect(new URL('/partner/dashboard', request.url))
  }

  // For now, let client-side handle auth checking
  // Admin routes will be protected by the component itself
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/admin/:path*']
}