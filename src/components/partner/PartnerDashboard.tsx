'use client'

import { useAuth } from '@/contexts/AuthContext'
import AuthGuard from '@/components/auth/AuthGuard'
import styles from './PartnerDashboard.module.css'

export default function PartnerDashboard() {
  const { userData } = useAuth()

  return (
    <AuthGuard requireAuth={true}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>파트너 대시보드</h1>
          <p className={styles.welcome}>
            {userData?.companyName || userData?.name}님, 환영합니다!
          </p>
        </div>

        <div className={styles.content}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>내 가게 관리</h2>
            <p className={styles.cardDescription}>
              영업시간, 메뉴 등록 등 가게 정보를 관리하세요.
            </p>
            <button className={styles.button} disabled>
              가게 정보 관리 (준비 중)
            </button>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>주문 관리</h2>
            <p className={styles.cardDescription}>
              들어온 주문을 확인하고 관리하세요.
            </p>
            <button className={styles.button} disabled>
              주문 관리 (준비 중)
            </button>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>매출 현황</h2>
            <p className={styles.cardDescription}>
              매출 통계와 정산 내역을 확인하세요.
            </p>
            <button className={styles.button} disabled>
              매출 현황 (준비 중)
            </button>
          </div>
        </div>

        <div className={styles.notice}>
          <h3 className={styles.noticeTitle}>중요 안내</h3>
          <p className={styles.noticeText}>
            파트너 활동을 위해서는 영업시간 등록 및 메뉴 등록이 필요합니다.<br />
            필수 항목 입력 후, 픽투잇 검수가 완료되면 정식 파트너로 활동하실 수 있습니다.
          </p>
        </div>
      </div>
    </AuthGuard>
  )
}