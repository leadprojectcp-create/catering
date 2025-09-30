'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import AuthGuard from './AuthGuard'
import styles from './ChooseTypePage.module.css'

export default function ChooseTypePage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<'user' | 'partner' | null>(null)

  const handleContinue = () => {
    if (!selectedType) return

    const params = new URLSearchParams()
    params.set('type', selectedType)

    router.push(`/signup/terms?${params.toString()}`)
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            픽투잇에서 어떤 서비스를<br />
            이용하고 싶으세요?
          </h1>
          <p className={styles.subtitle}>
            원하는 회원가입 유형을 선택해주세요
          </p>
        </div>

        <div className={styles.typeCards}>
          {/* 일반 회원 */}
          <div
            className={`${styles.typeCard} ${selectedType === 'user' ? styles.selected : ''}`}
            onClick={() => setSelectedType('user')}
          >
            <div className={styles.cardContent}>
              <p className={styles.cardDescription}>
                주문 및 업체검색을 원하신다면
              </p>
              <p className={styles.cardAction}>
                일반회원으로 가입하기
              </p>
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
            <div className={styles.cardContent}>
              <p className={styles.cardDescription}>
                판매 및 우리가게홍보를 원하신다면
              </p>
              <p className={styles.cardAction}>
                파트너회원으로 가입하기
              </p>
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