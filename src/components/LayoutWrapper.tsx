'use client'

import { usePathname } from 'next/navigation'
import BottomNavigator from './BottomNavigator'
import Footer from './Footer'

export default function LayoutWrapper() {
  const pathname = usePathname()

  // partner, admin, signup, login 페이지에서는 BottomNavigator와 Footer 숨김
  const hideBottomNav = pathname.startsWith('/partner') ||
                        pathname.startsWith('/admin') ||
                        pathname.startsWith('/signup') ||
                        pathname === '/login'

  if (hideBottomNav) {
    return null
  }

  return (
    <>
      <Footer />
      <BottomNavigator />
    </>
  )
}
