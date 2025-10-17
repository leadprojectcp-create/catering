'use client'

import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './PartnerBottomNav.module.css'

export default function PartnerBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  // 채팅룸 페이지에서는 바텀 네비게이터 숨기기
  if (pathname.startsWith('/chat/')) {
    return null
  }

  const menuItems = [
    {
      label: '홈',
      icon: '/partner-menu-icons/home.png',
      activeIcon: '/partner-menu-icons/home_active.png',
      path: '/partner/dashboard',
    },
    {
      label: '리뷰관리',
      icon: '/partner-menu-icons/review.png',
      activeIcon: '/partner-menu-icons/review_active.png',
      path: '/partner/reviews',
    },
    {
      label: '채팅',
      icon: '/partner-menu-icons/chat.png',
      activeIcon: '/partner-menu-icons/chat_active.png',
      path: '/chat',
    },
    {
      label: '상품관리',
      icon: '/partner-menu-icons/goods.png',
      activeIcon: '/partner-menu-icons/goods_active.png',
      path: '/partner/products',
    },
    {
      label: '주문관리',
      icon: '/partner-menu-icons/order.png',
      activeIcon: '/partner-menu-icons/order_active.png',
      path: '/partner/orders',
    },
  ]

  const isActive = (path: string) => {
    if (path === '/partner/dashboard') {
      return pathname === path
    }
    return pathname.startsWith(path)
  }

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.navContainer}>
        {menuItems.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              className={`${styles.navItem} ${active ? styles.active : ''}`}
              onClick={() => router.push(item.path)}
            >
              <Image
                src={active ? item.activeIcon : item.icon}
                alt={item.label}
                width={24}
                height={24}
                quality={100}
                unoptimized
                className={styles.navIcon}
              />
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
