import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl

  // 디버깅 로그
  console.log('[Middleware] hostname:', hostname)
  console.log('[Middleware] pathname:', url.pathname)

  // partner.danchemoim.com 서브도메인 접속 시
  if (hostname === 'partner.danchemoim.com' || hostname.startsWith('partner.danchemoim.com')) {
    console.log('[Middleware] Partner subdomain detected!')

    // 루트 경로(/)로 접속하면 /partner/dashboard로 리다이렉트
    if (url.pathname === '/') {
      console.log('[Middleware] Redirecting to /partner/dashboard')
      return NextResponse.redirect(new URL('/partner/dashboard', request.url))
    }

    // 다른 경로는 그대로 표시
    // 예: partner.danchemoim.com/partner/orders -> 그대로 표시
    return NextResponse.next()
  }

  // For now, let client-side handle auth checking
  // Admin routes will be protected by the component itself
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}