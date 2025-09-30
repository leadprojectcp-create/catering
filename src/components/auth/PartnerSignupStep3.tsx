'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signupUser } from '@/lib/auth'
import AuthGuard from './AuthGuard'
import styles from './SignupPage.module.css'

const categoryNames: { [key: string]: string } = {
  dessert: '디저트박스',
  sandwich: '샌드위치/베이커리',
  salad: '샐러드/과일',
  kimbap: '김밥/한식',
  traditional: '떡/전통한과/건과류'
}

interface Step2Data {
  storeName: string;
  category: string;
  city: string;
  district: string;
  dong: string;
  detailAddress: string;
}

interface SignupData {
  email: string;
  password?: string;
  name: string;
  phone: string;
  companyName: string;
  type: 'partner';
  termsAgreements: {
    service: boolean;
    privacy: boolean;
    marketing?: boolean;
  };
  businessCategory: string;
  businessRegistration: string;
  businessOwner: string;
  businessAddress: {
    city: string;
    district: string;
    dong: string;
    detail: string;
    fullAddress: string;
  };
}

export default function PartnerSignupStep3() {
  const router = useRouter()
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
  const [signupData, setSignupData] = useState<SignupData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Step2 표시용 데이터와 전체 회원가입 데이터 확인
    const savedStep2 = sessionStorage.getItem('partnerSignupStep2')
    const savedSignupData = sessionStorage.getItem('partnerSignupData')

    if (!savedStep2 || !savedSignupData) {
      // 데이터가 없으면 Step1로 돌아가기
      router.replace('/signup/partner/step1')
      return
    }

    setStep2Data(JSON.parse(savedStep2))
    setSignupData(JSON.parse(savedSignupData))
  }, [router])

  const completeSignup = async () => {
    if (!signupData || isLoading) return

    setIsLoading(true)
    try {
      const result = await signupUser(signupData)

      if (result.success) {
        // 세션 스토리지 정리
        sessionStorage.removeItem('partnerSignupStep1')
        sessionStorage.removeItem('partnerSignupStep2')
        sessionStorage.removeItem('partnerSignupData')

        alert('파트너 회원가입이 완료되었습니다!')
        return true
      } else {
        alert(result.error || '회원가입 중 오류가 발생했습니다.')
        return false
      }
    } catch (error) {
      console.error('Partner signup error:', error)
      alert('회원가입 중 오류가 발생했습니다.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoBack = async () => {
    // 회원가입 완료 후 홈으로 이동
    const success = await completeSignup()
    if (success) {
      router.replace('/')
    }
  }

  const handleManageStore = async () => {
    // 회원가입 완료 후 대시보드로 이동
    const success = await completeSignup()
    if (success) {
      router.push('/partner/dashboard')
    }
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
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : '홈으로'}
            </button>
            <button
              onClick={handleManageStore}
              className={styles.primaryButton}
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : '내 가게 관리하기'}
            </button>
          </div>

          <div className={styles.backLink}>
            <button
              onClick={() => router.push('/signup/partner/step2')}
              className={styles.backLinkText}
              disabled={isLoading}
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