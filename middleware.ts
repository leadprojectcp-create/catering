import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''

  // partner.danchemoim.com 서브도메인 접속 시 danchemoim.com/partner/dashboard로 리다이렉트
  if (hostname.includes('partner.danchemoim.com')) {
    return NextResponse.redirect('https://danchemoim.com/partner/dashboard')
  }

  // For now, let client-side handle auth checking
  // Admin routes will be protected by the component itself
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/admin/:path*']
}