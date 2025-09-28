'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Building, User, ChevronRight } from 'lucide-react'
import AuthGuard from './AuthGuard'
import styles from './ChooseTypePage.module.css'

export default function ChooseTypePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedType, setSelectedType] = useState<'user' | 'partner' | null>(null)

  // URL 파라미터에서 소셜 로그인 정보 가져오기
  const provider = searchParams.get('provider')
  const tempUserId = searchParams.get('tempUserId')

  const handleContinue = () => {
    if (!selectedType) return

    const params = new URLSearchParams()
    params.set('type', selectedType)

    router.push(`/signup/complete?${params.toString()}`)
  }

  return (
    <AuthGuard requireAuth={true} requireCompleteRegistration={false}>
      <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            회원 유형을 선택해주세요
          </h1>
          <p className={styles.subtitle}>
            서비스 이용 목적에 맞는 회원 유형을 선택하세요
          </p>
        </div>

        <div className={styles.typeCards}>
          {/* 일반 회원 */}
          <div
            className={`${styles.typeCard} ${selectedType === 'user' ? styles.selected : ''}`}
            onClick={() => setSelectedType('user')}
          >
            <div className={styles.cardIcon}>
              <User size={32} />
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>일반 회원</h3>
              <p className={styles.cardDescription}>
                케이터링 서비스를 이용하고 싶어요
              </p>
              <ul className={styles.cardFeatures}>
                <li>다양한 케이터링 업체 검색</li>
                <li>간편한 주문 및 결제</li>
                <li>리뷰 작성 및 평점 확인</li>
                <li>주문 내역 관리</li>
              </ul>
            </div>
            <div className={styles.cardArrow}>
              <ChevronRight size={20} />
            </div>
          </div>

          {/* 파트너 회원 */}
          <div
            className={`${styles.typeCard} ${selectedType === 'partner' ? styles.selected : ''}`}
            onClick={() => setSelectedType('partner')}
          >
            <div className={styles.cardIcon}>
              <Building size={32} />
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>파트너 회원</h3>
              <p className={styles.cardDescription}>
                케이터링 서비스를 제공하고 싶어요
              </p>
              <ul className={styles.cardFeatures}>
                <li>업체 정보 등록 및 관리</li>
                <li>메뉴 및 가격 설정</li>
                <li>주문 접수 및 처리</li>
                <li>매출 관리 및 정산</li>
              </ul>
            </div>
            <div className={styles.cardArrow}>
              <ChevronRight size={20} />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleContinue}
            disabled={!selectedType}
            className={styles.continueButton}
          >
            계속하기
          </button>

          <div className={styles.backLink}>
            <Link href="/login" className={styles.backLinkText}>
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  )
}