'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import AuthGuard from './AuthGuard'
import styles from './SignupPage.module.css'

export default function PartnerSignupStep1() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 약관 동의 정보 받기 및 날짜 추가
  const createTermsAgreements = () => {
    const now = new Date()
    return [
      {
        type: 'terms',
        name: '서비스 이용약관',
        agreed: searchParams.get('terms') === 'true',
        agreedAt: searchParams.get('terms') === 'true' ? now : null
      },
      {
        type: 'privacy',
        name: '개인정보수집/이용동의 (필수)',
        agreed: searchParams.get('privacy') === 'true',
        agreedAt: searchParams.get('privacy') === 'true' ? now : null
      },
      {
        type: 'thirdparty',
        name: '개인정보 제3자 정보제공 동의 (필수)',
        agreed: searchParams.get('thirdparty') === 'true',
        agreedAt: searchParams.get('thirdparty') === 'true' ? now : null
      },
      {
        type: 'marketing',
        name: '마케팅 활용 동의',
        agreed: searchParams.get('marketing') === 'true',
        agreedAt: searchParams.get('marketing') === 'true' ? now : null
      }
    ]
  }

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSocialUser, setIsSocialUser] = useState(false)

  useEffect(() => {
    // 소셜 로그인 사용자 정보 자동 입력
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid)
        const userDoc = await getDoc(userRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          // provider가 있으면 소셜 사용자
          if (userData.provider) {
            setFormData(prev => ({
              ...prev,
              name: userData.name || '',
              phone: userData.phone || '',
              email: userData.email || currentUser.email || ''
            }))
            setIsSocialUser(true)
          }
        }
      }
    })

    return () => unsubscribe()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 기본 정보 검증
    const validationError =
      !formData.name ? '이름을 입력해주세요.' :
      !formData.phone ? '휴대폰 번호를 입력해주세요.' :
      !formData.email ? '이메일을 입력해주세요.' :
      !isSocialUser && !formData.password ? '비밀번호를 입력해주세요.' :
      !isSocialUser && formData.password !== formData.confirmPassword ? '비밀번호가 일치하지 않습니다.' :
      !isSocialUser && formData.password.length < 6 ? '비밀번호는 6자 이상이어야 합니다.' :
      null

    if (validationError) {
      setError(validationError)
      return
    }

    try {
      // Firebase Auth 계정 생성 및 users 컬렉션에 기본 정보 저장
      const currentUser = auth.currentUser
      let uid: string

      if (isSocialUser && currentUser) {
        // 소셜 사용자는 이미 Firebase Auth에 등록되어 있음
        uid = currentUser.uid

        // users 컬렉션에 기본 정보 업데이트
        const userRef = doc(db, 'users', uid)
        await setDoc(userRef, {
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          type: 'partner',
          terms: createTermsAgreements(),
          registrationComplete: false, // Step2 완료 후 true로 변경
          createdAt: new Date(),
          updatedAt: new Date()
        }, { merge: true })
      } else {
        // 일반 회원가입 - Firebase Auth 계정 생성
        const { createUserWithEmailAndPassword } = await import('firebase/auth')
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        )
        uid = userCredential.user.uid

        // users 컬렉션에 기본 정보 저장
        const userRef = doc(db, 'users', uid)
        await setDoc(userRef, {
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          type: 'partner',
          terms: createTermsAgreements(),
          registrationComplete: false, // Step2 완료 후 true로 변경
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // UID를 세션 스토리지에 저장
      sessionStorage.setItem('partnerSignupUid', uid)

      // Step 1 데이터도 저장 (Step3에서 표시용)
      const step1Data = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email
      }
      sessionStorage.setItem('partnerSignupStep1', JSON.stringify(step1Data))

      router.push('/signup/partner/step2')
    } catch (error: unknown) {
      console.error('Partner signup step1 error:', error)

      // Firebase 에러 메시지를 한국어로 변환
      const errorMessages: { [key: string]: string } = {
        'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
        'auth/weak-password': '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
        'auth/invalid-email': '유효하지 않은 이메일 주소입니다.'
      }

      const errorCode = (error as { code?: string }).code
      const errorMessage = errorCode && errorMessages[errorCode]
        ? errorMessages[errorCode]
        : '회원가입 중 오류가 발생했습니다.'

      setError(errorMessage)
    }
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.header}>
            {/* Progress indicator */}
            <div className={styles.progressContainer}>
              <div className={styles.progressItem}>
                <div className={`${styles.progressCircle} ${styles.active}`}>1</div>
              </div>
              <div className={styles.progressItem}>
                <div className={styles.progressCircle}>2</div>
              </div>
              <div className={styles.progressItem}>
                <div className={styles.progressCircle}>3</div>
              </div>
            </div>

            <h1 className={styles.title}>
              파트너 회원가입을 위해<br />
              기본정보를 입력해주세요
            </h1>
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
                  placeholder="이름을 입력해주세요"
                />
              </div>

              {/* 휴대폰 번호 */}
              <div className={styles.inputGroup}>
                <label htmlFor="phone" className={styles.label}>
                  휴대폰 번호
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className={styles.inputNoIcon}
                  placeholder="'-' 없이 입력"
                />
              </div>

              {/* 이메일(아이디) */}
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  이메일(아이디)
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.inputNoIcon}
                  placeholder="이메일(아이디)을 입력해주세요"
                  disabled={isSocialUser}
                  readOnly={isSocialUser}
                />
              </div>

              {/* 비밀번호 - 소셜 사용자는 숨김 */}
              {!isSocialUser && (
                <>
                  <div className={styles.inputGroup}>
                    <label htmlFor="password" className={styles.label}>
                      비밀번호
                    </label>
                    <div className={styles.passwordWrapper}>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className={styles.passwordInput}
                        placeholder="비밀번호를 입력해주세요"
                      />
                      <button
                        type="button"
                        className={styles.eyeButton}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* 비밀번호 확인 */}
                  <div className={styles.inputGroup}>
                    <label htmlFor="confirmPassword" className={styles.label}>
                      비밀번호 확인
                    </label>
                    <div className={styles.passwordWrapper}>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={styles.passwordInput}
                        placeholder="비밀번호 확인을 위해 한번 더 입력해주세요"
                      />
                      <button
                        type="button"
                        className={styles.eyeButton}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                className={styles.submitButton}
              >
                다음
              </button>
            </div>

            <div className={styles.backLink}>
              <Link href="/signup/terms" className={styles.backLinkText}>
                이전으로 돌아가기
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}