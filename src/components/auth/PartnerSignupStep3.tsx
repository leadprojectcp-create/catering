'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from './AuthGuard'
import styles from './SignupPage.module.css'

const categoryNames: { [key: string]: string } = {
  dessert: '디저트박스',
  sandwich: '샌드위치',
  salad: '샐러드/과일',
  kimbap: '김밥/한식',
  traditional: '떡/전통한과'
}

interface Step2Data {
  storeName: string;
  category: string;
  city: string;
  district: string;
  dong: string;
  detailAddress: string;
}

export default function PartnerSignupStep3() {
  const router = useRouter()
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)

  useEffect(() => {
    // Step2 표시용 데이터 확인
    const savedStep2 = sessionStorage.getItem('partnerSignupStep2')
    const uid = sessionStorage.getItem('partnerSignupUid')

    if (!savedStep2 || !uid) {
      // 데이터가 없으면 Step1로 돌아가기
      router.replace('/signup/partner/step1')
      return
    }

    setStep2Data(JSON.parse(savedStep2))
  }, [router])

  const handleGoBack = () => {
    // 세션 스토리지 정리
    sessionStorage.removeItem('partnerSignupStep1')
    sessionStorage.removeItem('partnerSignupStep2')
    sessionStorage.removeItem('partnerSignupUid')

    router.replace('/')
  }

  const handleManageStore = () => {
    // 세션 스토리지 정리
    sessionStorage.removeItem('partnerSignupStep1')
    sessionStorage.removeItem('partnerSignupStep2')
    sessionStorage.removeItem('partnerSignupUid')

    router.push('/partner/dashboard')
  }

  if (!step2Data) {
    return <div>Loading...</div>
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.header}>
            {/* Progress indicator */}
            <div className={`${styles.progressContainer} ${styles.step3}`}>
              <div className={styles.progressItem}>
                <div className={`${styles.progressCircle} ${styles.completed}`}>1</div>
              </div>
              <div className={styles.progressItem}>
                <div className={`${styles.progressCircle} ${styles.completed}`}>2</div>
              </div>
              <div className={styles.progressItem}>
                <div className={`${styles.progressCircle} ${styles.active}`}>3</div>
              </div>
            </div>

            <h1 className={styles.title}>
              픽투잇 파트너<br />
              회원가입이 완료되었어요!
            </h1>
          </div>

          <div className={styles.confirmationCard}>
            <div className={styles.infoSection}>
              <h3 className={styles.sectionTitle}>가게정보</h3>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>가게명</span>
                <span className={styles.infoValue}>{step2Data.storeName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>업종</span>
                <span className={styles.infoValue}>{categoryNames[step2Data.category]}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>위치</span>
                <span className={styles.infoValue}>
                  {step2Data.city} {step2Data.district} {step2Data.dong} {step2Data.detailAddress}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.warningBox}>
            <div className={styles.warningTitle}>잠시만요! 알려드릴게 있어요.</div>
            <div className={styles.warningText}>
              파트너 활동을 활성화 하기 위해선 [내 가게 관리]에서 영업시간 등록 및 메뉴등록<br />
              절차가 필요해요. 필수 항목 입력 후, 픽투잇 검수가 끝난뒤 파트너 등록이 완료되요!
            </div>
          </div>

          <div className={styles.buttonContainer}>
            <button
              onClick={handleGoBack}
              className={styles.secondaryButton}
            >
              홈으로
            </button>
            <button
              onClick={handleManageStore}
              className={styles.primaryButton}
            >
              내 가게 관리하기
            </button>
          </div>

          <div className={styles.backLink}>
            <button
              onClick={() => router.push('/signup/partner/step2')}
              className={styles.backLinkText}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              이전으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}