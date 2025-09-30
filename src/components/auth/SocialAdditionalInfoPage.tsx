'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import AuthGuard from './AuthGuard'
import styles from './SocialAdditionalInfoPage.module.css'

export default function SocialAdditionalInfoPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    companyName: '' // 파트너일 경우에만 사용
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingUserData, setExistingUserData] = useState<{
    email?: string;
    name?: string;
    phone?: string;
    provider?: string;
    type?: string;
  } | null>(null)

  useEffect(() => {
    // 인증 상태 변화 감지
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    // 현재 사용자의 기존 정보 로드
    const loadUserData = async () => {
      if (user) {
        const userRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setExistingUserData(userData)
          setFormData(prev => ({
            ...prev,
            name: userData.name || '',
            phone: userData.phone || '',
            companyName: userData.companyName || ''
          }))
        }
      }
    }

    loadUserData()
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // 소셜 로그인 사용자 검증
    if (!formData.name) {
      setError('이름을 입력해주세요.')
      setIsLoading(false)
      return
    }

    if (!formData.phone) {
      setError('전화번호를 입력해주세요.')
      setIsLoading(false)
      return
    }

    // 파트너 회원이면 회사명 필수
    if (existingUserData?.type === 'partner' && !formData.companyName) {
      setError('회사명을 입력해주세요.')
      setIsLoading(false)
      return
    }

    try {
      if (user) {
        const userRef = doc(db, 'users', user.uid)

        // 현재 Firestore에 저장된 이메일 확인
        const currentUserDoc = await getDoc(userRef)
        const currentEmail = currentUserDoc.exists() ? currentUserDoc.data().email : ''

        const updateData = {
          email: user.email || existingUserData?.email || currentEmail || '',
          name: formData.name,
          phone: formData.phone,
          companyName: formData.companyName || '',
          registrationComplete: true,
          updatedAt: new Date()
        }

        await updateDoc(userRef, updateData)

        alert('추가 정보가 저장되었습니다!')
        router.push('/') // 메인 페이지로 리다이렉트
      }
    } catch (error) {
      console.error('Social additional info update error:', error)
      setError('정보 저장 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const isPartner = existingUserData?.type === 'partner'

  return (
    <AuthGuard requireAuth={true}>
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              추가 정보를 입력하여<br />
              {isPartner ? '파트너 ' : ''}회원가입을 완료해주세요
            </h1>
            <p className={styles.subtitle}>
              {isPartner ? '케이터링 사업자 정보를 입력해주세요' : '기본 정보를 입력해주세요'}
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div>
              {/* 이름 */}
              <div className={styles.inputGroup}>
                <label htmlFor="name" className={styles.label}>
                  이름
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={styles.inputNoIcon}
                  placeholder="홍길동"
                />
              </div>

              {/* 파트너일 경우 회사명 */}
              {isPartner && (
                <div className={styles.inputGroup}>
                  <label htmlFor="companyName" className={styles.label}>
                    회사명 <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    className={styles.inputNoIcon}
                    placeholder="픽투잇 케이터링"
                  />
                </div>
              )}

              {/* 전화번호 */}
              <div className={styles.inputGroup}>
                <label htmlFor="phone" className={styles.label}>
                  전화번호
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className={styles.inputNoIcon}
                  placeholder="010-1234-5678"
                />
              </div>

              {/* 소셜 로그인 정보 표시 - 숨김 처리 */}
              {/* <div className={styles.inputGroup}>
                <label className={styles.label}>
                  이메일 (소셜 로그인)
                </label>
                <div className={styles.staticInfo}>
                  {user?.email || existingUserData?.email || '이메일 정보 없음'}
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  가입 유형
                </label>
                <div className={styles.staticInfo}>
                  {isPartner ? '파트너 회원' : '일반 회원'}
                </div>
              </div> */}
            </div>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isLoading ? '저장 중...' : '회원가입 완료'}
              </button>
            </div>

            <div className={styles.backLink}>
              <Link href="/login" className={styles.backLinkText}>
                로그인으로 돌아가기
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}