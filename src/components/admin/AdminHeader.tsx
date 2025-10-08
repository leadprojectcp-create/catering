'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './AdminHeader.module.css'
import { usePathname } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'

const adminMenuItems = [
  {
    category: '대시보드',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    ),
    items: [
      { name: '관리자 대시보드', path: '/admin/dashboard' }
    ]
  },
  {
    category: '활동',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    ),
    items: [
      { name: '활동 로그', path: '/admin/logs' }
    ]
  },
  {
    category: '관리',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
    items: [
      { name: '업체 추가', path: '/add-restaurant' },
      { name: '주문 관리', path: '/admin/orders' },
      { name: '가게 관리', path: '/admin/stores' },
      { name: '사용자 관리', path: '/admin/users' }
    ]
  }
]

export default function AdminHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
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

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          {/* 로고 */}
          <div className={styles.logoContainer}>
            <Link href="/admin/dashboard">
              <Image
                src="/assets/admin_logo.png"
                alt="관리자 로고"
                width={250}
                height={50}
                style={{ width: '250px', height: 'auto' }}
                priority
                onError={(e) => {
                  // 이미지 로드 실패 시 텍스트로 대체
                  e.currentTarget.style.display = 'none'
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    parent.innerHTML = '<span style="font-size: 24px; font-weight: bold; color: #8b5cf6;">Admin Center</span>'
                  }
                }}
              />
            </Link>
          </div>

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
      </header>

      {/* 오버레이 */}
      {isDrawerOpen && (
        <div className={styles.overlay} onClick={closeDrawer} />
      )}

      {/* 사이드 드로어 */}
      <div className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>관리자 센터</h2>
          <button
            className={styles.closeButton}
            onClick={closeDrawer}
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>

        <nav className={styles.drawerNav}>
          {adminMenuItems.map((category) => (
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
          <Link
            href="/"
            className={styles.drawerMainButton}
            onClick={closeDrawer}
          >
            메인 페이지
          </Link>
          <button
            onClick={handleLogout}
            className={styles.drawerLogoutButton}
          >
            로그아웃
          </button>
        </div>
      </div>
    </>
  )
}
