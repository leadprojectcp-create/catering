'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Header.module.css'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

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

export default function Header() {
  const pathname = usePathname()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { userData, logout } = useAuth()

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
          {/* 로고 */}
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

          {/* 오른쪽 메뉴 영역 */}
          <div className={styles.rightSection}>
            {/* 파트너 페이지 링크 (partner일 경우만 표시) */}
            {userData && userData.type === 'partner' && (
              <Link href="/partner/dashboard" className={styles.partnerIconLink}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                <span>파트너페이지</span>
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