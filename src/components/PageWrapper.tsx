'use client'

import { usePathname } from 'next/navigation'

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // 채팅 페이지는 wrapper를 적용하지 않음
  const isChatPage = pathname.startsWith('/chat')

  if (isChatPage) {
    return <>{children}</>
  }

  return <div className="page-wrapper">{children}</div>
}
