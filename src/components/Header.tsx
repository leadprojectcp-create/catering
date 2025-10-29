'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import OptimizedImage from '@/components/common/OptimizedImage'
import styles from './Header.module.css'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getCartItemCount } from '@/lib/services/cartService'
import { subscribeToUnreadCount } from '@/lib/services/chatService'

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
  if (path === '/orders') return '주문/배송내역'
  if (path.startsWith('/orders/')) return '주문상세'
  if (path === '/points') return '포인트'
  if (path === '/notices') return '공지사항'
  if (path.startsWith('/notices/')) return '공지사항'
  if (path === '/faq') return '고객센터'
  if (path === '/contact') return '문의하기'
  if (path.startsWith('/productDetail/')) return '상품 주문'
  if (path === '/payments') return '결제하기'
  if (path.startsWith('/store/')) return '가게 정보'
  if (path === '/magazine') return '매거진'
  if (path.startsWith('/magazine/')) return '매거진'
  if (path.startsWith('/reviews/write')) return '리뷰 작성'
  if (path.startsWith('/reviews/edit/')) return '리뷰 수정'
  if (path === '/reviews') return '리뷰 관리'
  if (path === '/settings') return '설정'
  if (path.startsWith('/settings/password-change')) return '비밀번호 변경'
  if (path.startsWith('/settings/withdrawal')) return '회원탈퇴'
  return ''
}

interface HeaderProps {
  chatRoomTitle?: string
  chatRoomPhone?: string
  chatRoomMenu?: React.ReactNode
}

export default function Header({ chatRoomTitle, chatRoomPhone, chatRoomMenu }: HeaderProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { userData, logout, user, loading } = useAuth()
  const [cartCount, setCartCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 로고를 표시할 페이지 목록 (메인 페이지 + 헤더 메뉴 아이콘으로 접속하는 페이지들)
  const showLogoPages = [
    '/',           // 홈
    '/wishlist',   // 찜
    '/cart',       // 장바구니
    '/chat',       // 채팅
    '/orders'      // 주문내역
  ]

  const isExcludedPath = pathname.startsWith('/partner') || pathname.startsWith('/admin') || pathname.startsWith('/signup') || pathname === '/login'
  // PC에서는 채팅룸 선택 시에도 로고 표시, 모바일에서만 뒤로가기 + 이름 표시
  // isMobile이 undefined면 chatRoomTitle 우선 고려 (깜빡임 방지)
  const shouldShowLogo = (showLogoPages.includes(pathname) || (pathname.startsWith('/chat/') && !chatRoomTitle)) && !isExcludedPath && (isMobile === undefined ? !chatRoomTitle : (!chatRoomTitle || !isMobile))
  const pageTitle = chatRoomTitle?.trim() || getPageTitle(pathname)

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
          {/* 로고 또는 뒤로가기 버튼 + 타이틀 */}
          <div className={styles.leftSection}>
            {shouldShowLogo ? (
              <div className={styles.logoContainer}>
                <Link href="/">
                  <OptimizedImage
                    src="/assets/logo.png"
                    alt="로고"
                    width={150}
                    height={0}
                    className={styles.logo}
                    priority
                    style={{ width: 'auto', height: 'auto' }}
                  />
                </Link>
              </div>
            ) : (
              <>
                <button
                  className={styles.backButton}
                  onClick={() => {
                    // 채팅룸에서는 채팅 목록으로 이동
                    if (pathname === '/chat' || pathname.startsWith('/chat/')) {
                      router.push('/chat')
                    } else {
                      router.back()
                    }
                  }}
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
            )}
          </div>

          {/* 오른쪽 메뉴 영역 */}
          <div className={styles.rightSection}>
            {user ? (
              <>
                {/* 모바일 채팅룸일 때는 전화 버튼과 메뉴 표시 */}
                {isMobile && chatRoomTitle ? (
                  <div className={styles.chatRoomActions}>
                    <a
                      href={chatRoomPhone ? `tel:${chatRoomPhone}` : '#'}
                      className={styles.phoneButton}
                      onClick={(e) => {
                        if (!chatRoomPhone) {
                          e.preventDefault()
                          alert('전화번호가 없습니다.')
                        }
                      }}
                    >
                      <span className={styles.phoneIcon}>
                        <OptimizedImage
                          src="/icons/phone.png"
                          alt="전화"
                          width={20}
                          height={20}
                          unoptimized
                        />
                      </span>
                      <span>전화</span>
                    </a>
                    {chatRoomMenu}
                  </div>
                ) : (
                  <>
                    {/* 로그인 상태 - 메뉴 아이콘들 표시 */}
                    {/* 페이지 타이틀이 있을 때만 홈 아이콘 표시 */}
                    {pageTitle && (
                      <Link href="/" className={styles.homeIconLink}>
                        <OptimizedImage
                          src={pathname === '/' ? '/menu-icons/home_active.png' : '/menu-icons/home.png'}
                          alt="홈"
                          width={24}
                          height={24}
                        />
                      </Link>
                    )}

                    {/* 찜 아이콘 */}
                    <Link href="/wishlist" className={styles.wishlistIconLink}>
                      <OptimizedImage
                        src={pathname === '/wishlist' ? '/menu-icons/heart_active.png' : '/menu-icons/heart.png'}
                        alt="찜"
                        width={24}
                        height={24}
                      />
                    </Link>

                    {/* 장바구니 아이콘 */}
                    <Link href="/cart" className={styles.cartIconLink}>
                      <OptimizedImage
                        src={pathname === '/cart' ? '/menu-icons/shopping_active.png' : '/menu-icons/shopping.png'}
                        alt="장바구니"
                        width={24}
                        height={24}
                      />
                      {cartCount > 0 && (
                        <span className={styles.cartBadge}>N</span>
                      )}
                    </Link>

                    {/* 채팅 아이콘 */}
                    <Link href="/chat" className={styles.chatIconLink}>
                      <OptimizedImage
                        src={pathname === '/chat' || pathname.startsWith('/chat/') ? '/menu-icons/chat_active.png' : '/menu-icons/chat.png'}
                        alt="채팅"
                        width={24}
                        height={24}
                      />
                      {unreadCount > 0 && (
                        <span className={styles.chatBadge}>N</span>
                      )}
                    </Link>

                    {/* 주문내역 아이콘 */}
                    <Link href="/orders" className={styles.ordersIconLink}>
                      <OptimizedImage
                        src={pathname === '/orders' ? '/menu-icons/order_active.png' : '/menu-icons/order.png'}
                        alt="주문내역"
                        width={24}
                        height={24}
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
                )}
              </>
            ) : (
              /* 로그아웃 상태 - 로그인/회원가입 버튼만 표시 */
              <button
                className={styles.loginButton}
                onClick={() => router.push('/login')}
              >
                로그인/회원가입
              </button>
            )}
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
          {/* 사용자 정보 */}
          {userData && (
            <>
              <div className={styles.userName}>
                <span>{userData.name || '사용자'}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
              <Link href="/points" className={styles.userPoints} onClick={closeDrawer}>
                <span>내 포인트</span>
                <span>{(userData.point || 0).toLocaleString()}P</span>
              </Link>
            </>
          )}

          <Link
            href="/wishlist"
            className={`${styles.drawerMenuItem} ${pathname === '/wishlist' ? styles.drawerMenuItemActive : ''}`}
            onClick={closeDrawer}
          >
            <OptimizedImage
              src={pathname === '/wishlist' ? '/menu-icons/heart_active.png' : '/menu-icons/heart.png'}
              alt="찜"
              width={20}
              height={20}
              className={styles.menuIcon}
            />
            찜
          </Link>
          <Link
            href="/orders"
            className={`${styles.drawerMenuItem} ${pathname === '/orders' ? styles.drawerMenuItemActive : ''}`}
            onClick={closeDrawer}
          >
            <OptimizedImage
              src={pathname === '/orders' ? '/menu-icons/order_active.png' : '/menu-icons/order.png'}
              alt="주문내역"
              width={20}
              height={20}
              className={styles.menuIcon}
            />
            주문내역
          </Link>
          <Link
            href="/cart"
            className={`${styles.drawerMenuItem} ${pathname === '/cart' ? styles.drawerMenuItemActive : ''}`}
            onClick={closeDrawer}
          >
            <OptimizedImage
              src={pathname === '/cart' ? '/menu-icons/shopping_active.png' : '/menu-icons/shopping.png'}
              alt="장바구니"
              width={20}
              height={20}
              className={styles.menuIcon}
            />
            장바구니
          </Link>
          <Link
            href="/chat"
            className={`${styles.drawerMenuItem} ${pathname === '/chat' || pathname.startsWith('/chat/') ? styles.drawerMenuItemActive : ''}`}
            onClick={closeDrawer}
          >
            <OptimizedImage
              src={pathname === '/chat' || pathname.startsWith('/chat/') ? '/menu-icons/chat_active.png' : '/menu-icons/chat.png'}
              alt="채팅"
              width={20}
              height={20}
              className={styles.menuIcon}
            />
            채팅
          </Link>
          <Link
            href="/reviews"
            className={`${styles.drawerMenuItem} ${pathname === '/reviews' ? styles.drawerMenuItemActive : ''}`}
            onClick={closeDrawer}
          >
            <OptimizedImage
              src={pathname === '/reviews' ? '/menu-icons/review_active.png' : '/menu-icons/review.png'}
              alt="리뷰관리"
              width={20}
              height={20}
              className={styles.menuIcon}
            />
            리뷰관리
          </Link>
          <Link
            href="/faq"
            className={`${styles.drawerMenuItem} ${pathname === '/faq' ? styles.drawerMenuItemActive : ''}`}
            onClick={closeDrawer}
          >
            <OptimizedImage
              src={pathname === '/faq' ? '/menu-icons/service_active.png' : '/menu-icons/service.png'}
              alt="고객센터"
              width={20}
              height={20}
              className={styles.menuIcon}
            />
            고객센터
          </Link>
          <Link
            href="/notices"
            className={`${styles.drawerMenuItem} ${pathname === '/notices' || pathname.startsWith('/notices/') ? styles.drawerMenuItemActive : ''}`}
            onClick={closeDrawer}
          >
            <OptimizedImage
              src={pathname === '/notices' || pathname.startsWith('/notices/') ? '/menu-icons/notice_active.png' : '/menu-icons/notice.png'}
              alt="공지사항"
              width={20}
              height={20}
              className={styles.menuIcon}
            />
            공지사항
          </Link>
          <Link
            href="/settings"
            className={`${styles.drawerMenuItem} ${pathname === '/settings' ? styles.drawerMenuItemActive : ''}`}
            onClick={closeDrawer}
          >
            <OptimizedImage
              src={pathname === '/settings' ? '/menu-icons/setting_active.png' : '/menu-icons/setting.png'}
              alt="설정"
              width={20}
              height={20}
              className={styles.menuIcon}
            />
            설정
          </Link>

          {/* 로그아웃 / 로그인 */}
          {userData ? (
            <button className={styles.drawerMenuItem} onClick={handleLogout}>
              <OptimizedImage
                src="/menu-icons/logout.png"
                alt="로그아웃"
                width={20}
                height={20}
                className={styles.menuIcon}
              />
              로그아웃
            </button>
          ) : (
            <Link href="/login" className={styles.drawerMenuItem} onClick={closeDrawer}>
              로그인
            </Link>
          )}

          {/* 파트너 페이지 링크 (partner일 경우만 표시) */}
          {userData && userData.type === 'partner' && (
            <Link
              href="/partner/dashboard"
              className={styles.partnerLink}
              onClick={closeDrawer}
            >
              <div className={styles.partnerLinkContent}>
                <OptimizedImage
                  src="/menu-icons/partner_center.png"
                  alt="파트너 센터"
                  width={110}
                  height={0}
                  className={styles.partnerLogo}
                  style={{ height: 'auto' }}
                />
                <span className={styles.partnerText}>바로가기</span>
              </div>
              <Image
                src="/icons/arrow.svg"
                alt="화살표"
                width={24}
                height={24}
                className={styles.partnerArrow}
              />
            </Link>
          )}
        </nav>
      </div>
    </>
  )
}