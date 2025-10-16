'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './PartnerHeader.module.css'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToUnreadCount } from '@/lib/services/chatService'

// 페이지 경로에 따른 타이틀 매핑
const getPageTitle = (path: string): string => {
  if (path === '/partner/dashboard') return ''
  if (path === '/partner/store/management') return '가게관리'
  if (path === '/partner/reviews') return '리뷰관리'
  if (path === '/partner/review/management') return '리뷰관리'
  if (path === '/partner/notice/management') return '공지사항 관리'
  if (path === '/partner/notice/write') return '공지사항 작성'
  if (path === '/partner/product/add') return '상품등록'
  if (path === '/partner/product/management') return '상품관리'
  if (path === '/partner/products') return '상품관리'
  if (path === '/partner/order/history') return '주문내역'
  if (path === '/partner/orders') return '주문관리'
  if (path === '/partner/order/settlements') return '정산내역'
  if (path === '/chat') return '채팅'
  if (path.startsWith('/chat/')) return '채팅'
  return ''
}

const partnerMenuItems = [
  {
    category: '가게',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ),
    items: [
      { name: '가게관리', path: '/partner/store/management' }
    ]
  },
  {
    category: '리뷰',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    ),
    items: [
      { name: '리뷰관리', path: '/partner/review/management' }
    ]
  },
  {
    category: '공지사항',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
    items: [
      { name: '공지사항 관리', path: '/partner/notice/management' },
      { name: '공지사항 작성', path: '/partner/notice/write' }
    ]
  },
  {
    category: '상품',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    ),
    items: [
      { name: '상품등록', path: '/partner/product/add' },
      { name: '상품관리', path: '/partner/product/management' }
    ]
  },
  {
    category: '주문',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
      </svg>
    ),
    items: [
      { name: '주문내역', path: '/partner/order/history' },
      { name: '정산내역', path: '/partner/order/settlements' }
    ]
  },
  {
    category: '기타',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    ),
    items: [
      { name: '메인 페이지', path: '/' }
    ]
  }
]

export default function PartnerHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, loading } = useAuth()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // 대시보드인지 확인
  const isDashboard = pathname === '/partner/dashboard'
  const showBackButton = !isDashboard
  const pageTitle = getPageTitle(pathname)

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  // 읽지 않은 메시지 개수 실시간 구독
  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    console.log('[PartnerHeader] 실시간 구독 시작:', user.uid)
    console.log('[PartnerHeader] user 객체:', user)

    // 실시간 구독 설정
    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = subscribeToUnreadCount(user.uid, (count: number) => {
        console.log('[PartnerHeader] unreadCount 업데이트:', count, typeof count)
        setUnreadCount(count)
      })
    } catch (error) {
      console.error('[PartnerHeader] 읽지 않은 메시지 구독 실패:', error)
      setUnreadCount(0)
    }

    return () => {
      console.log('[PartnerHeader] 구독 해제')
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch (error) {
          console.error('[PartnerHeader] 구독 해제 실패:', error)
        }
      }
    }
  }, [user])

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
                <Link href="/partner/dashboard">
                  <Image
                    src="/assets/partners_logo.png"
                    alt="파트너 로고"
                    width={250}
                    height={50}
                    quality={100}
                    unoptimized
                    style={{ width: '250px', height: 'auto' }}
                    priority
                  />
                </Link>
              </div>
            )}
          </div>

          <div className={styles.rightSection}>
            {user ? (
              <>
                {/* 로그인 상태 - 메뉴 아이콘들 표시 */}
                {/* 홈 아이콘 */}
                {pathname !== '/partner/dashboard' && (
                  <Link href="/partner/dashboard" className={styles.iconLink}>
                    <Image
                      src="/partner-menu-icons/home.png"
                      alt="홈"
                      width={24}
                      height={24}
                      quality={100}
                      unoptimized
                    />
                  </Link>
                )}

                {/* 리뷰관리 아이콘 */}
                <Link href="/partner/reviews" className={styles.iconLink}>
                  <Image
                    src={pathname.startsWith('/partner/reviews') ? '/partner-menu-icons/review_active.png' : '/partner-menu-icons/review.png'}
                    alt="리뷰관리"
                    width={24}
                    height={24}
                    quality={100}
                    unoptimized
                  />
                </Link>

                {/* 채팅 아이콘 */}
                <Link href="/chat" className={styles.iconLink}>
                  <Image
                    src={pathname === '/chat' ? '/partner-menu-icons/chat_active.png' : '/partner-menu-icons/chat.png'}
                    alt="채팅"
                    width={24}
                    height={24}
                    quality={100}
                    unoptimized
                  />
                  {unreadCount > 0 && (
                    <span className={styles.chatBadge}>{unreadCount}</span>
                  )}
                </Link>

                {/* 상품관리 아이콘 */}
                <Link href="/partner/products" className={styles.iconLink}>
                  <Image
                    src={pathname.startsWith('/partner/product') ? '/partner-menu-icons/goods_active.png' : '/partner-menu-icons/goods.png'}
                    alt="상품관리"
                    width={24}
                    height={24}
                    quality={100}
                    unoptimized
                  />
                </Link>

                {/* 주문관리 아이콘 */}
                <Link href="/partner/orders" className={styles.iconLink}>
                  <Image
                    src={pathname.startsWith('/partner/order') ? '/partner-menu-icons/order_active.png' : '/partner-menu-icons/order.png'}
                    alt="주문관리"
                    width={24}
                    height={24}
                    quality={100}
                    unoptimized
                  />
                </Link>

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
              </>
            ) : (
              <>
                {/* 로그아웃 상태 - 로그인/회원가입 버튼만 표시 */}
                <button
                  className={styles.loginButton}
                  onClick={() => router.push('/login')}
                >
                  로그인/회원가입
                </button>

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
              </>
            )}
          </div>
        </div>
      </header>

      {/* 오버레이 및 사이드 드로어 (로그인 상태일 때만 표시) */}
      {user && (
        <>
          {/* 오버레이 */}
          {isDrawerOpen && (
            <div className={styles.overlay} onClick={closeDrawer} />
          )}

          {/* 사이드 드로어 */}
          <div className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ''}`}>
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>파트너 센터</h2>
              <button
                className={styles.closeButton}
                onClick={closeDrawer}
                aria-label="상품 닫기"
              >
                ✕
              </button>
            </div>

            <nav className={styles.drawerNav}>
              {partnerMenuItems.map((category) => (
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
              <button
                onClick={handleLogout}
                className={styles.drawerLogoutButton}
              >
                로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}