'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { LayoutDashboard } from 'lucide-react'
import styles from './Footer.module.css'

export default function Footer() {
  const { user, userData } = useAuth()

  // 레벨 10 사용자(관리자)만 대시보드 버튼 표시
  const isAdmin = userData?.level === 10
  // 로그인된 사용자인지 확인
  const isLoggedIn = !!user

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.leftContent}>
            <div className={styles.companyName}>Pick to Eat</div>
            <div className={styles.companyInfo}>
              (주)리프컴퍼니 | CEO 박상호 | 사업자 등록번호 413-87-02826
            </div>
            <div className={styles.address}>
              서울특별시 광진구 아차산로62길 14-12(구의동, 대영트윈,투)
            </div>
            <div className={styles.inquiryLink}>
              <a
                href="https://open.kakao.com/o/sMuPjBTh"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.inquiryText}
              >
                입점 문의
              </a>
            </div>
            <div className={styles.copyright}>
              © 2025 Leapcompany. All rights reserved.
            </div>
          </div>

          {isLoggedIn && (
            <div className={styles.rightContent}>
              <div className={styles.adminButtons}>
                {isAdmin && (
                  <Link href="/admin/dashboard" className={styles.dashboardButton}>
                    <LayoutDashboard size={20} />
                    관리자 대시보드
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}