'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './SettingsPage.module.css'
import TermsModal from '@/components/terms/TermsModal'
import ServiceTerms from '@/components/terms/ServiceTerms'
import PrivacyPolicy from '@/components/terms/PrivacyPolicy'
import ThirdPartyConsent from '@/components/terms/ThirdPartyConsent'
import MarketingConsent from '@/components/terms/MarketingConsent'
import RefundPolicy from '@/components/terms/RefundPolicy'

type TermType = 'service' | 'privacy' | 'third-party' | 'marketing' | 'payment' | 'refund' | null

export default function SettingsPage() {
  const router = useRouter()
  const [marketingNotification, setMarketingNotification] = useState(false)
  const [serviceNotification, setServiceNotification] = useState(true)
  const [currentTerm, setCurrentTerm] = useState<TermType>(null)

  const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'

  const handleLogout = () => {
    // TODO: 로그아웃 로직 구현
    console.log('로그아웃')
  }

  const handlePasswordChange = () => {
    router.push('/settings/password-change')
  }

  const handleWithdrawal = () => {
    router.push('/settings/withdrawal')
  }

  const handleTermClick = (termType: TermType) => {
    setCurrentTerm(termType)
  }

  const closeTermModal = () => {
    setCurrentTerm(null)
  }

  const renderTermContent = () => {
    switch (currentTerm) {
      case 'service':
        return <ServiceTerms />
      case 'privacy':
        return <PrivacyPolicy />
      case 'third-party':
        return <ThirdPartyConsent />
      case 'marketing':
        return <MarketingConsent />
      case 'refund':
        return <RefundPolicy />
      case 'payment':
        return (
          <div>
            <h2>결제대행 서비스 이용약관</h2>
            <p>결제대행 서비스 이용약관 내용이 여기에 표시됩니다.</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      <TermsModal isOpen={currentTerm !== null} onClose={closeTermModal}>
        {renderTermContent()}
      </TermsModal>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>설정</h1>
        </div>

      {/* 서비스 및 알림 설정 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>서비스 및 알림 설정</h2>
        <div className={styles.settingList}>
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>마케팅 알림 설정</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={marketingNotification}
                onChange={(e) => setMarketingNotification(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>서비스 관련 알림 설정</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={serviceNotification}
                onChange={(e) => setServiceNotification(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
        </div>
      </div>

      {/* 서비스 약관 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>서비스 약관</h2>
        <div className={styles.settingList}>
          <div className={styles.settingItem} onClick={() => handleTermClick('service')}>
            <span className={styles.settingLabel}>서비스 약관</span>
            <svg
              className={styles.arrowIcon}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M9 6L15 12L9 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.settingItem} onClick={() => handleTermClick('privacy')}>
            <span className={styles.settingLabel}>개인정보 처리방침</span>
            <svg
              className={styles.arrowIcon}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M9 6L15 12L9 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.settingItem} onClick={() => handleTermClick('third-party')}>
            <span className={styles.settingLabel}>제3자 정보제공 약관</span>
            <svg
              className={styles.arrowIcon}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M9 6L15 12L9 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.settingItem} onClick={() => handleTermClick('marketing')}>
            <span className={styles.settingLabel}>마케팅 활용약관</span>
            <svg
              className={styles.arrowIcon}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M9 6L15 12L9 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.settingItem} onClick={() => handleTermClick('payment')}>
            <span className={styles.settingLabel}>결제대행 서비스 이용약관</span>
            <svg
              className={styles.arrowIcon}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M9 6L15 12L9 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.settingItem} onClick={() => handleTermClick('refund')}>
            <span className={styles.settingLabel}>교환 및 반품 안내약관</span>
            <svg
              className={styles.arrowIcon}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M9 6L15 12L9 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* 고객서비스 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>고객서비스</h2>
        <div className={styles.settingList}>
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>현재버전</span>
            <span className={styles.versionText}>{APP_VERSION}</span>
          </div>
          <div className={styles.settingItem} onClick={handlePasswordChange}>
            <span className={styles.settingLabel}>비밀번호 변경</span>
            <svg
              className={styles.arrowIcon}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M9 6L15 12L9 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.settingItem} onClick={handleWithdrawal}>
            <span className={styles.settingLabel}>회원탈퇴</span>
            <svg
              className={styles.arrowIcon}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M9 6L15 12L9 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}
