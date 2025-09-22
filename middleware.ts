import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(_request: NextRequest) {
  // For now, let client-side handle auth checking
  // Admin routes will be protected by the component itself
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}