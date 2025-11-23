'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import BottomNavigator from './BottomNavigator'
import PartnerBottomNav from './partner/PartnerBottomNav'
import PartnerHeader from './partner/PartnerHeader'
import Header from './Header'
import Footer from './Footer'

export default function LayoutWrapper() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { userData } = useAuth()

  // partner 페이지인지 확인
  const isPartnerPage = pathname.startsWith('/partner')
  // 사용자 타입 확인
  const isPartner = userData?.type === 'partner'
  // 채팅 페이지에서 roomId가 있으면 채팅룸으로 간주
  const hasRoomId = searchParams.get('roomId') !== null
  const isChatListPage = pathname === '/chat' && !hasRoomId
  const isChatRoomPage = pathname.startsWith('/chat/') || (pathname === '/chat' && hasRoomId)
  // ProductDetail 페이지인지 확인
  const isProductDetailPage = pathname.startsWith('/productDetail/')

  // admin, signup, login, redirect 페이지에서는 모든 네비게이션 숨김
  const hideAllNav = pathname.startsWith('/admin') ||
                     pathname.startsWith('/signup') ||
                     pathname === '/login' ||
                     pathname.startsWith('/redirect')

  if (hideAllNav) {
    return null
  }

  // 채팅룸 페이지에서는 아무것도 표시하지 않음
  if (isChatRoomPage) {
    return null
  }

  // 채팅 리스트 페이지에서는 사용자 타입에 따라 바텀 네비게이터 표시
  if (isChatListPage) {
    return isPartner ? <PartnerBottomNav /> : <BottomNavigator />
  }

  // 파트너 페이지에서는 파트너 헤더, 파트너용 바텀 네비게이터와 Footer 표시
  if (isPartnerPage) {
    return (
      <>
        <PartnerHeader />
        {!isProductDetailPage && <Footer />}
        <PartnerBottomNav />
      </>
    )
  }

  // 일반 사용자 페이지에서는 일반 헤더, 바텀 네비게이터와 Footer 표시
  return (
    <>
      <Header />
      {!isProductDetailPage && <Footer />}
      <BottomNavigator />
    </>
  )
}
