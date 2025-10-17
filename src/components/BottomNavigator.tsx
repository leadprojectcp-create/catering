'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCartItemCount } from '@/lib/services/cartService'
import { subscribeToUnreadCount } from '@/lib/services/chatService'
import styles from './BottomNavigator.module.css'

export default function BottomNavigator() {
  const pathname = usePathname()

  // 채팅룸 페이지에서는 바텀 네비게이터 숨기기 (최우선 체크)
  if (pathname.startsWith('/chat/') || pathname.startsWith('/partner')) {
    return null
  }

  const { user } = useAuth()
  const [cartCount, setCartCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  // 장바구니 개수 로드
  useEffect(() => {
    const loadCartCount = async () => {
      if (user) {
        try {
          const count = await getCartItemCount(user.uid)
          setCartCount(count)
        } catch (error) {
          console.error('장바구니 개수 로드 실패:', error)
        }
      } else {
        setCartCount(0)
      }
    }

    loadCartCount()
  }, [user, pathname])

  // 읽지 않은 메시지 개수 실시간 구독
  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = subscribeToUnreadCount(user.uid, (count: number) => {
        setUnreadCount(count)
      })
    } catch (error) {
      console.error('[BottomNavigator] 읽지 않은 메시지 구독 실패:', error)
      setUnreadCount(0)
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch (error) {
          console.error('[BottomNavigator] 구독 해제 실패:', error)
        }
      }
    }
  }, [user])

  const navItems = [
    {
      name: '홈',
      path: '/',
      iconDefault: '/menu-icons/home.svg',
      iconActive: '/menu-icons/home_active.svg'
    },
    {
      name: '찜',
      path: '/wishlist',
      iconDefault: '/menu-icons/heart.png',
      iconActive: '/menu-icons/heart_active.png'
    },
    {
      name: '채팅',
      path: '/chat',
      badge: unreadCount,
      iconDefault: '/menu-icons/chat.png',
      iconActive: '/menu-icons/chat_active.png'
    },
    {
      name: '장바구니',
      path: '/cart',
      badge: cartCount,
      iconDefault: '/menu-icons/shopping.png',
      iconActive: '/menu-icons/shopping_active.png'
    },
    {
      name: '주문내역',
      path: '/orders',
      iconDefault: '/menu-icons/order.png',
      iconActive: '/menu-icons/order_active.png'
    }
  ]

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => {
        const isActive = pathname === item.path
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <div className={styles.iconWrapper}>
              <Image
                src={isActive ? item.iconActive : item.iconDefault}
                alt={item.name}
                width={24}
                height={24}
              />
              {item.badge !== undefined && item.badge > 0 && (
                <span className={styles.badge}>N</span>
              )}
            </div>
            <span className={styles.label}>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
