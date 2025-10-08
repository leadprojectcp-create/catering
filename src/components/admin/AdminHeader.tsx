'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './AdminHeader.module.css'
import { usePathname } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'

const adminMenuItems = [
  { label: '대시보드', path: '/admin/dashboard', icon: '📊' },
  { label: '사용자 관리', path: '/admin/users', icon: '👥' },
  { label: '업체 관리', path: '/admin/stores', icon: '🏪' },
  { label: '주문 관리', path: '/admin/orders', icon: '📦' },
  { label: '매거진 관리', path: '/admin/magazine', icon: '📝' },
  { label: '통계', path: '/admin/analytics', icon: '📈' },
  { label: '로그', path: '/admin/logs', icon: '📋' },
  { label: '설정', path: '/admin/settings', icon: '⚙️' },
  { label: '사용자 페이지로', path: '/', icon: '🏠' }
]

export default function AdminHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          {/* 햄버거 메뉴 버튼 */}
          <button
            className={styles.menuButton}
            onClick={toggleSidebar}
            aria-label="메뉴"
          >
            <span className={styles.hamburger}></span>
            <span className={styles.hamburger}></span>
            <span className={styles.hamburger}></span>
          </button>

          {/* 로고 */}
          <div className={styles.logoContainer}>
            <Link href="/admin/dashboard">
              <span className={styles.logoText}>Admin Center</span>
            </Link>
          </div>

          {/* 로그아웃 버튼 */}
          <button onClick={handleLogout} className={styles.logoutButton}>
            로그아웃
          </button>
        </div>
      </header>

      {/* 왼쪽 사이드바 */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>관리자</h2>
        </div>

        <nav className={styles.sidebarNav}>
          {adminMenuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.sidebarMenuItem} ${pathname === item.path ? styles.sidebarMenuItemActive : ''}`}
            >
              <span className={styles.menuIcon}>{item.icon}</span>
              <span className={styles.menuLabel}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
