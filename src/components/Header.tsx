'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Header.module.css'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getCartItemCount } from '@/lib/services/cartService'
import { subscribeToUnreadCount } from '@/lib/services/chatService'

const menuItems = [
  {
    category: '마이페이지',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    ),
    items: [
      { name: '채팅', path: '/chat' },
      { name: '주문내역', path: '/orders' }
    ]
  },
  {
    category: '고객센터',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
    items: [
      { name: '공지사항', path: '/notices' },
      { name: '자주묻는질문', path: '/faq' },
      { name: '문의하기', path: '/contact' }
    ]
  }
]

// 페이지 경로에 따른 타이틀 매핑
const getPageTitle = (path: string): string => {
  if (path.startsWith('/category/')) {
    const categoryName = decodeURIComponent(path.split('/category/')[1])
    return categoryName
  }
  if (path === '/cart') return '장바구니'
  if (path === '/wishlist') return '찜'
  if (path === '/chat') return '채팅'
  if (path.startsWith('/chat/')) return '채팅'
  if (path === '/orders') return '주문내역'
  if (path === '/notices') return '공지사항'
  if (path === '/faq') return '자주묻는질문'
  if (path === '/contact') return '문의하기'
  if (path.startsWith('/order/')) return '상품 주문'
  if (path === '/payments') return '결제'
  if (path.startsWith('/store/')) return '가게 정보'
  if (path === '/magazine') return '매거진'
  if (path.startsWith('/magazine/')) return '매거진'
  if (path.startsWith('/reviews/write')) return '리뷰 작성'
  return ''
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { userData, logout, user } = useAuth()
  const [cartCount, setCartCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  // 메인 페이지인지 확인 (/ 또는 /partner, /admin, /signup, /login 제외)
  const isMainPage = pathname === '/'
  const isExcludedPath = pathname.startsWith('/partner') || pathname.startsWith('/admin') || pathname.startsWith('/signup') || pathname === '/login'
  const showBackButton = !isMainPage && !isExcludedPath
  const pageTitle = getPageTitle(pathname)

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

    // 실시간 구독 설정
    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = subscribeToUnreadCount(user.uid, (count: number) => {
        setUnreadCount(count)
      })
    } catch (error) {
      console.error('[Header] 읽지 않은 메시지 구독 실패:', error)
      setUnreadCount(0)
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch (error) {
          console.error('[Header] 구독 해제 실패:', error)
        }
      }
    }
  }, [user])

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      closeDrawer()
      alert('로그아웃되었습니다.')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃 중 오류가 발생했습니다.')
    }
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          {/* 뒤로가기 버튼 + 타이틀 또는 로고 */}
          <div className={styles.leftSection}>
            {showBackButton ? (
              <>
                <button
                  className={styles.backButton}
                  onClick={() => router.back()}
                  aria-label="뒤로가기"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                {pageTitle && (
                  <h1 className={styles.pageTitle}>{pageTitle}</h1>
                )}
              </>
            ) : (
              <div className={styles.logoContainer}>
                <Link href="/">
                  <Image
                    src="/assets/logo.png"
                    alt="로고"
                    width={150}
                    height={0}
                    className={styles.logo}
                    quality={100}
                    priority
                    style={{ height: 'auto' }}
                  />
                </Link>
              </div>
            )}
          </div>

          {/* 오른쪽 메뉴 영역 */}
          <div className={styles.rightSection}>
            {/* 찜 아이콘 (로그인한 사용자만 표시) */}
            {user && (
              <Link href="/wishlist" className={styles.wishlistIconLink}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </Link>
            )}

            {/* 장바구니 아이콘 (로그인한 사용자만 표시) */}
            {user && (
              <Link href="/cart" className={styles.cartIconLink}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                {cartCount > 0 && (
                  <span className={styles.cartBadge}>{cartCount}</span>
                )}
              </Link>
            )}

            {/* 채팅 아이콘 (로그인한 사용자만 표시) */}
            {user && (
              <Link href="/chat" className={styles.chatIconLink}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className={styles.chatBadge}>{unreadCount}</span>
                )}
              </Link>
            )}

            {/* 주문내역 아이콘 (로그인한 사용자만 표시) */}
            {user && (
              <Link href="/orders" className={styles.ordersIconLink}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </Link>
            )}

            {/* 햄버거 메뉴 버튼 */}
            <button
              className={styles.menuButton}
              onClick={toggleDrawer}
              aria-label="메뉴"
            >
              <span className={styles.hamburger}></span>
              <span className={styles.hamburger}></span>
              <span className={styles.hamburger}></span>
            </button>
          </div>
        </div>
      </header>

      {/* 오버레이 */}
      {isDrawerOpen && (
        <div className={styles.overlay} onClick={closeDrawer} />
      )}

      {/* 사이드 드로어 */}
      <div className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>메뉴</h2>
          <button
            className={styles.closeButton}
            onClick={closeDrawer}
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>

        <nav className={styles.drawerNav}>
          {/* 파트너 페이지 링크 (partner일 경우만 표시) */}
          {userData && userData.type === 'partner' && (
            <div className={styles.menuCategory}>
              <h3 className={styles.categoryTitle}>
                <span className={styles.categoryIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                </span>
                파트너
              </h3>
              <div className={styles.categoryItems}>
                <Link
                  href="/partner/dashboard"
                  className={`${styles.drawerMenuItem} ${pathname === '/partner/dashboard' ? styles.drawerMenuItemActive : ''}`}
                  onClick={closeDrawer}
                >
                  파트너 페이지
                </Link>
              </div>
            </div>
          )}

          {menuItems.map((category) => (
            <div key={category.category} className={styles.menuCategory}>
              <h3 className={styles.categoryTitle}>
                <span className={styles.categoryIcon}>{category.icon}</span>
                {category.category}
              </h3>
              <div className={styles.categoryItems}>
                {category.items.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`${styles.drawerMenuItem} ${pathname === item.path ? styles.drawerMenuItemActive : ''}`}
                    onClick={closeDrawer}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className={styles.drawerFooter}>
          {userData ? (
            <button className={styles.drawerLogoutButton} onClick={handleLogout}>
              로그아웃
            </button>
          ) : (
            <Link href="/login" className={styles.drawerLoginButton} onClick={closeDrawer}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </>
  )
}