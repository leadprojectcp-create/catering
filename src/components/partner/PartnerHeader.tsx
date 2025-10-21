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
  if (path === '/partner/notice') return '공지사항'
  if (path.startsWith('/partner/notice/') && path !== '/partner/notice/management' && path !== '/partner/notice/write') return '공지사항 상세'
  if (path === '/partner/notice/management') return '공지사항 관리'
  if (path === '/partner/notice/write') return '공지사항 작성'
  if (path === '/partner/partnerNotice') return '파트너 공지사항'
  if (path.startsWith('/partner/partnerNotice/') && !path.includes('/management') && !path.includes('/write') && !path.includes('/edit')) return '파트너 공지사항 상세'
  if (path === '/partner/partnerNotice/management') return '파트너 공지사항 관리'
  if (path === '/partner/partnerNotice/write') return '파트너 공지사항 작성'
  if (path.startsWith('/partner/partnerNotice/edit/')) return '파트너 공지사항 수정'
  if (path === '/partner/partnerFaq') return '고객센터'
  if (path === '/partner/settlement-accounts') return '정산계좌관리'
  if (path === '/partner/settings') return '설정'
  if (path === '/partner/settings/password-change') return '비밀번호 변경'
  if (path === '/partner/settings/withdrawal') return '회원탈퇴'
  if (path === '/partner/product/add') return '상품등록'
  if (path.startsWith('/partner/product/edit/')) return '상품수정'
  if (path === '/partner/product/management') return '상품관리'
  if (path === '/partner/products') return '상품관리'
  if (path === '/partner/order/history') return '주문내역'
  if (path === '/partner/orders') return '주문관리'
  if (path === '/partner/order/settlements') return '정산내역'
  if (path === '/partner/settlement') return '정산 내역'
  if (path === '/chat') return '채팅'
  if (path.startsWith('/chat/')) return '채팅'
  return ''
}

const partnerMenuItems = [
  {
    category: '가게',
    iconSrc: '/partner-menu-icons/partner_store.png',
    items: [
      { name: '가게관리', path: '/partner/store/management' }
    ]
  },
  {
    category: '리뷰',
    iconSrc: '/partner-menu-icons/partner_review.png',
    items: [
      { name: '리뷰관리', path: '/partner/reviews' }
    ]
  },
  {
    category: '파트너 공지사항',
    iconSrc: '/partner-menu-icons/partner_notice.png',
    items: [
      { name: '파트너 공지사항 관리', path: '/partner/partnerNotice/management' },
      { name: '파트너 공지사항 작성', path: '/partner/partnerNotice/write' }
    ]
  },
  {
    category: '상품',
    iconSrc: '/partner-menu-icons/partner_product.png',
    items: [
      { name: '상품등록', path: '/partner/product/add' },
      { name: '상품관리', path: '/partner/product/management' }
    ]
  },
  {
    category: '주문',
    iconSrc: '/partner-menu-icons/partner_order.png',
    items: [
      { name: '주문내역', path: '/partner/order/history' },
      { name: '정산내역', path: '/partner/settlement' }
    ]
  },
]

interface PartnerHeaderProps {
  chatRoomTitle?: string
  chatRoomPhone?: string
  chatRoomMenu?: React.ReactNode
}

export default function PartnerHeader({ chatRoomTitle, chatRoomPhone, chatRoomMenu }: PartnerHeaderProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, loading } = useAuth()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
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

  // 로고를 표시할 페이지 목록
  const showLogoPages = [
    '/partner/dashboard',
    '/partner/reviews',
    '/chat',
    '/partner/product/management',
    '/partner/order/history'
  ]

  // PC에서는 채팅룸 선택 시에도 로고 표시, 모바일에서만 뒤로가기 + 이름 표시
  // isMobile이 undefined면 chatRoomTitle 우선 고려 (깜빡임 방지)
  const shouldShowLogo = (showLogoPages.includes(pathname) || (pathname.startsWith('/chat/') && !chatRoomTitle)) && (isMobile === undefined ? !chatRoomTitle : (!chatRoomTitle || !isMobile))
  const pageTitle = chatRoomTitle?.trim() || getPageTitle(pathname)

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
          {/* 로고 또는 뒤로가기 버튼 + 타이틀 */}
          <div className={styles.leftSection}>
            {shouldShowLogo ? (
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
                        <Image
                          src="/icons/phone.png"
                          alt="전화"
                          width={20}
                          height={20}
                          quality={100}
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
                      <Link href="/partner/dashboard" className={styles.iconLink}>
                        <Image
                          src={pathname === '/partner/dashboard' ? '/partner-menu-icons/home_active.png' : '/partner-menu-icons/home.png'}
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
                    <Link href="/partner/product/management" className={styles.iconLink}>
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
                    <Link href="/partner/order/history" className={styles.iconLink}>
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
                    <Image
                      src={category.iconSrc}
                      alt={category.category}
                      width={16}
                      height={16}
                      quality={100}
                      unoptimized
                    />
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

              {/* 사용자 페이지로 이동 버튼 */}
              <Link
                href="/"
                className={styles.userPageButton}
                onClick={closeDrawer}
              >
                <Image
                  src="/assets/menu_logo.png"
                  alt="단체모임"
                  width={24}
                  height={24}
                  quality={100}
                  unoptimized
                />
                <span>사용자 페이지로</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              {/* 추가 메뉴 */}
              <div className={styles.menuCategoryFooter}>
                <div className={styles.categoryItems}>
                  {/* 정산계좌관리 */}
                  <Link
                    href="/partner/settlement-accounts"
                    className={styles.drawerMenuItemWithIcon}
                    onClick={closeDrawer}
                  >
                    <Image
                      src="/partner-menu-icons/partner_order.png"
                      alt="정산계좌관리"
                      width={20}
                      height={20}
                      quality={100}
                      unoptimized
                    />
                    <span>정산계좌관리</span>
                  </Link>

                  {/* 설정 */}
                  <Link
                    href="/partner/settings"
                    className={styles.drawerMenuItemWithIcon}
                    onClick={closeDrawer}
                  >
                    <Image
                      src="/partner-menu-icons/partner_settings.png"
                      alt="설정"
                      width={20}
                      height={20}
                      quality={100}
                      unoptimized
                    />
                    <span>설정</span>
                  </Link>

                  {/* 공지사항 */}
                  <Link
                    href="/partner/notice"
                    className={styles.drawerMenuItemWithIcon}
                    onClick={closeDrawer}
                  >
                    <Image
                      src="/partner-menu-icons/notice.png"
                      alt="공지사항"
                      width={20}
                      height={20}
                      quality={100}
                      unoptimized
                    />
                    <span>공지사항</span>
                  </Link>

                  {/* 고객센터 */}
                  <Link
                    href="/partner/partnerFaq"
                    className={styles.drawerMenuItemWithIcon}
                    onClick={closeDrawer}
                  >
                    <Image
                      src="/partner-menu-icons/partner_consumer.png"
                      alt="고객센터"
                      width={20}
                      height={20}
                      quality={100}
                      unoptimized
                    />
                    <span>고객센터</span>
                  </Link>

                  {/* 로그아웃 */}
                  <button
                    onClick={handleLogout}
                    className={styles.drawerMenuItemWithIcon}
                  >
                    <Image
                      src="/partner-menu-icons/partner_logout.png"
                      alt="로그아웃"
                      width={20}
                      height={20}
                      quality={100}
                      unoptimized
                    />
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  )
}