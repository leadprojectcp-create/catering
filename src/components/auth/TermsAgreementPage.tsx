'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import AuthGuard from './AuthGuard'
import TermsModal from '../terms/TermsModal'
import ServiceTerms from '../terms/ServiceTerms'
import PrivacyPolicy from '../terms/PrivacyPolicy'
import ThirdPartyConsent from '../terms/ThirdPartyConsent'
import MarketingConsent from '../terms/MarketingConsent'
import styles from './TermsAgreementPage.module.css'

export default function TermsAgreementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedType = searchParams.get('type') as 'user' | 'partner' | null
  const [user, setUser] = useState<User | null>(null)
  const [isSocialUser, setIsSocialUser] = useState(false)
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    thirdparty: false,
    marketing: false
  })

  const [modalState, setModalState] = useState({
    isOpen: false,
    content: null as React.ReactNode
  })

  useEffect(() => {
    // 인증 상태 변화 감지
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      // 소셜 로그인 사용자인지 확인
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid)
        const userDoc = await getDoc(userRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setIsSocialUser(!!userData.provider) // provider가 있으면 소셜 사용자
        }
      }
    })

    return () => unsubscribe()
  }, [])

  const handleAllAgreement = (checked: boolean) => {
    setAgreements({
      all: checked,
      terms: checked,
      privacy: checked,
      thirdparty: checked,
      marketing: checked
    })
  }

  const handleIndividualAgreement = (key: string, checked: boolean) => {
    const newAgreements = {
      ...agreements,
      [key]: checked
    }

    // 개별 체크박스가 모두 체크되면 전체동의도 체크
    newAgreements.all = newAgreements.terms && newAgreements.privacy && newAgreements.thirdparty && newAgreements.marketing

    setAgreements(newAgreements)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreements.terms || !agreements.privacy || !agreements.thirdparty) {
      alert('필수 약관에 동의해주세요.')
      return
    }

    // 소셜 사용자인 경우 약관 동의 정보와 회원 유형을 DB에 저장
    if (isSocialUser && user && selectedType) {
      try {
        const userRef = doc(db, 'users', user.uid)

        // 약관 동의 정보를 배열로 구성
        const termsArray = [
          {
            type: 'terms',
            name: '서비스 이용약관',
            agreed: agreements.terms,
            agreedAt: agreements.terms ? new Date() : null
          },
          {
            type: 'privacy',
            name: '개인정보수집/이용동의 (필수)',
            agreed: agreements.privacy,
            agreedAt: agreements.privacy ? new Date() : null
          },
          {
            type: 'thirdparty',
            name: '개인정보 제3자 정보제공 동의 (필수)',
            agreed: agreements.thirdparty,
            agreedAt: agreements.thirdparty ? new Date() : null
          },
          {
            type: 'marketing',
            name: '마케팅 활용 동의',
            agreed: agreements.marketing,
            agreedAt: agreements.marketing ? new Date() : null
          }
        ]

        // 기존 사용자 데이터에서 이메일 가져오기
        const userDoc = await getDoc(userRef)
        const existingEmail = userDoc.exists() ? userDoc.data().email : ''

        await updateDoc(userRef, {
          email: user.email || existingEmail || '', // 기존 이메일 유지
          type: selectedType,
          terms: termsArray,
          registrationComplete: false, // 회원가입 진행 중
          updatedAt: new Date()
        })
      } catch (error) {
        console.error('약관 동의 저장 오류:', error)
      }
    }

    // 다음 단계로 이동
    if (isSocialUser) {
      // 소셜 사용자
      if (selectedType === 'partner') {
        // 파트너는 Step1로 (소셜 정보가 자동 입력됨)
        router.push('/signup/partner/step1')
      } else {
        // 일반 회원은 소셜 추가 정보 입력 페이지로
        router.push('/signup/social-additional-info')
      }
    } else {
      // 일반 사용자는 이메일 회원가입 페이지로 (회원 유형과 약관 정보 전달)
      const params = new URLSearchParams()
      if (selectedType) params.set('type', selectedType)

      // 약관 동의 정보도 전달
      params.set('terms', agreements.terms.toString())
      params.set('privacy', agreements.privacy.toString())
      params.set('thirdparty', agreements.thirdparty.toString())
      params.set('marketing', agreements.marketing.toString())

      // 파트너면 3단계 회원가입으로, 일반 사용자는 기존 페이지로
      if (selectedType === 'partner') {
        router.push(`/signup/partner/step1?${params.toString()}`)
      } else {
        router.push(`/signup?${params.toString()}`)
      }
    }
  }

  const openModal = (content: React.ReactNode) => {
    setModalState({
      isOpen: true,
      content
    })
  }

  const closeModal = () => {
    setModalState({
      isOpen: false,
      content: null
    })
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃 중 오류가 발생했습니다.')
    }
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.header}>
            <div className={styles.title}>
              서비스 이용을 위해<br />
              약관동의 후 회원가입을 진행해주세요
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.termsSection}>

              <div className={styles.allAgreementWrapper}>
                <div className={styles.allAgreementItem}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={agreements.all}
                      onChange={(e) => handleAllAgreement(e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span className={`${styles.checkboxText} ${agreements.all ? styles.allAgreementActive : styles.allAgreementInactive}`}>전체 동의</span>
                  </label>
                </div>
              </div>

              <div className={styles.agreementItem}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={agreements.terms}
                    onChange={(e) => handleIndividualAgreement('terms', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>
                    서비스 이용약관 (필수)
                  </span>
                </label>
                <button
                  type="button"
                  className={styles.viewLink}
                  onClick={() => openModal(<ServiceTerms />)}
                >
                  보기
                </button>
              </div>

              <div className={styles.agreementItem}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={agreements.privacy}
                    onChange={(e) => handleIndividualAgreement('privacy', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>
                    개인정보수집/이용동의 (필수)
                  </span>
                </label>
                <button
                  type="button"
                  className={styles.viewLink}
                  onClick={() => openModal(<PrivacyPolicy />)}
                >
                  보기
                </button>
              </div>

              <div className={styles.agreementItem}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={agreements.thirdparty}
                    onChange={(e) => handleIndividualAgreement('thirdparty', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>
                    개인정보 제3자 정보제공 동의 (필수)
                  </span>
                </label>
                <button
                  type="button"
                  className={styles.viewLink}
                  onClick={() => openModal(<ThirdPartyConsent />)}
                >
                  보기
                </button>
              </div>

              <div className={styles.agreementItem}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={agreements.marketing}
                    onChange={(e) => handleIndividualAgreement('marketing', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>
                    마케팅 활용 동의(선택)
                  </span>
                </label>
                <button
                  type="button"
                  className={styles.viewLink}
                  onClick={() => openModal(<MarketingConsent />)}
                >
                  보기
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
            >
              다음
            </button>
          </form>

          <div className={styles.backLink}>
            <Link href="/signup/choose-type" className={styles.backLinkText}>
              이전으로 돌아가기
            </Link>
          </div>

          {user && (
            <div className={styles.backLink}>
              <button
                onClick={handleLogout}
                className={styles.backLinkText}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>

        <TermsModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
        >
          {modalState.content}
        </TermsModal>
      </div>
    </AuthGuard>
  )
}