'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import BottomNavigator from './BottomNavigator'
import PartnerBottomNav from './partner/PartnerBottomNav'
import PartnerHeader from './partner/PartnerHeader'
import Header from './Header'
import Footer from './Footer'

export default function LayoutWrapper() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // partner 페이지인지 확인
  const isPartnerPage = pathname.startsWith('/partner')
  // 채팅 페이지에서 roomId가 있으면 채팅룸으로 간주
  const hasRoomId = searchParams.get('roomId') !== null
  const isChatListPage = pathname === '/chat' && !hasRoomId
  const isChatRoomPage = pathname.startsWith('/chat/') || (pathname === '/chat' && hasRoomId)

  // admin, signup, login 페이지에서는 모든 네비게이션 숨김
  const hideAllNav = pathname.startsWith('/admin') ||
                     pathname.startsWith('/signup') ||
                     pathname === '/login'

  if (hideAllNav) {
    return null
  }

  // 채팅룸 페이지에서는 아무것도 표시하지 않음
  if (isChatRoomPage) {
    return null
  }

  // 채팅 리스트 페이지에서는 바텀 네비게이터만 표시 (푸터는 제거)
  if (isChatListPage) {
    return <BottomNavigator />
  }

  // 파트너 페이지에서는 파트너 헤더, 파트너용 바텀 네비게이터와 Footer 표시
  if (isPartnerPage) {
    return (
      <>
        <PartnerHeader />
        <Footer />
        <PartnerBottomNav />
      </>
    )
  }

  // 일반 사용자 페이지에서는 일반 헤더, 바텀 네비게이터와 Footer 표시
  return (
    <>
      <Header />
      <Footer />
      <BottomNavigator />
    </>
  )
}
