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
            <div className={styles.companyName}>단모</div>
            <div className={styles.companyInfo}>
              (주)리프컴퍼니 | CEO 박상호, CTO 배철응, CDD 정윤우 | 사업자 등록번호 413-87-02826 | 통신판매업 신고번호 2024-서울광진-1870
            </div>
            <div className={styles.companyInfo}>
              서울특별시 광진구 아차산로62길 14-12(구의동, 대영트윈,투) | 대표번호 1666-5157
            </div>
            <div className={styles.disclaimer}>
              (주)리프컴퍼니는 통신판매중개자로서 통신판매의 당사자가 아니며 상품 거래정보 및 거래 등에 대해 책임을 지지 않습니다.
            </div>
            <div className={styles.copyright}>
              © 2025 leadproject.cp. All rights reserved.
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