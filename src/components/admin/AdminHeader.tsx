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
  { label: '쿠폰 관리', path: '/admin/coupons', icon: '🎟️' },
  { label: '업체 관리', path: '/admin/stores', icon: '🏪' },
  { label: '상품 관리', path: '/admin/products', icon: '🛍️' },
  { label: 'AI 카테고리', path: '/admin/ai-category', icon: '🤖' },
  { label: 'AI 카테고리 관리', path: '/admin/ai-category-manage', icon: '⚡' },
  { label: '주문 관리', path: '/admin/orders', icon: '📦' },
  { label: '매거진 관리', path: '/admin/magazine', icon: '📝' },
  { label: '공지사항 관리', path: '/admin/notices', icon: '📢' },
  { label: 'FAQ 관리', path: '/admin/faqs', icon: '❓' },
  { label: '팝업 관리', path: '/admin/popups', icon: '🎨' },
  { label: '배너 관리', path: '/admin/banners', icon: '🖼️' },
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
      {/* 왼쪽 사이드바 */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/admin/dashboard" className={styles.logoLink}>
            <h2 className={styles.sidebarTitle}>🎯 Admin Center</h2>
          </Link>
          <button
            className={styles.menuButton}
            onClick={toggleSidebar}
            aria-label="메뉴 토글"
          >
            ☰
          </button>
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

        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            🚪 로그아웃
          </button>
        </div>
      </div>
    </>
  )
}
