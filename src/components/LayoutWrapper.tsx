'use client'

import { usePathname } from 'next/navigation'
import BottomNavigator from './BottomNavigator'
import PartnerBottomNav from './partner/PartnerBottomNav'
import Footer from './Footer'

export default function LayoutWrapper() {
  const pathname = usePathname()

  // partner 페이지인지 확인
  const isPartnerPage = pathname.startsWith('/partner')

  // admin, signup, login 페이지에서는 모든 네비게이션 숨김
  const hideAllNav = pathname.startsWith('/admin') ||
                     pathname.startsWith('/signup') ||
                     pathname === '/login'

  if (hideAllNav) {
    return null
  }

  // 파트너 페이지에서는 파트너용 바텀 네비게이터와 Footer 표시
  if (isPartnerPage) {
    return (
      <>
        <Footer />
        <PartnerBottomNav />
      </>
    )
  }

  // 일반 사용자 페이지에서는 일반 바텀 네비게이터와 Footer 표시
  return (
    <>
      <Footer />
      <BottomNavigator />
    </>
  )
}
