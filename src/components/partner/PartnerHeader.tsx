'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './PartnerHeader.module.css'
import { usePathname } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'

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
      { name: '리뷰관리', path: '/partner/review/management' },
      { name: '공지사항', path: '/partner/review/notices' }
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
      { name: '예약현황', path: '/partner/order/reservations' },
      { name: '정산내역', path: '/partner/order/settlements' }
    ]
  }
]

export default function PartnerHeader() {
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
            <Link href="/partner/dashboard">
              <Image
                src="/assets/partners_logo.png"
                alt="파트너 로고"
                width={250}
                height={50}
                style={{ width: '250px', height: 'auto' }}
                priority
              />
            </Link>
          </div>

          {/* 햄버거 상품 버튼 */}
          <button
            className={styles.menuButton}
            onClick={toggleDrawer}
            aria-label="상품"
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