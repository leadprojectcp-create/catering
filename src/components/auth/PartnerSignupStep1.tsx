'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import AuthGuard from './AuthGuard'
import styles from './SignupPage.module.css'

export default function PartnerSignupStep1() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

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

  // SMS 인증 관련 상태
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [timer, setTimer] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)

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

  // 타이머 효과
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [timer])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })

    // 전화번호가 변경되면 인증 상태 초기화
    if (name === 'phone') {
      setIsVerified(false)
      setVerificationSent(false)
      setVerificationCode('')
      setTimer(0)
    }
  }

  // 인증번호 발송
  const handleSendVerification = async () => {
    if (!formData.phone) {
      setError('휴대폰 번호를 입력해주세요.')
      return
    }

    setSendingCode(true)
    setError('')

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone })
      })

      const data = await response.json()

      if (data.success) {
        setVerificationSent(true)
        setTimer(300) // 5분
        alert('인증번호가 발송되었습니다.')
      } else {
        setError(data.error || '인증번호 발송에 실패했습니다.')
      }
    } catch (error) {
      console.error('SMS send error:', error)
      setError('인증번호 발송 중 오류가 발생했습니다.')
    } finally {
      setSendingCode(false)
    }
  }

  // 인증번호 확인
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('인증번호를 입력해주세요.')
      return
    }

    setVerifyingCode(true)
    setError('')

    try {
      const response = await fetch('/api/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          code: verificationCode
        })
      })

      const data = await response.json()

      if (data.success) {
        setIsVerified(true)
        setTimer(0)
        alert('인증이 완료되었습니다.')
      } else {
        setError(data.error || '인증번호가 일치하지 않습니다.')
      }
    } catch (error) {
      console.error('SMS verify error:', error)
      setError('인증 확인 중 오류가 발생했습니다.')
    } finally {
      setVerifyingCode(false)
    }
  }

  // 타이머 포맷 (MM:SS)
  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 기본 정보 검증
    const validationError =
      !formData.name ? '이름을 입력해주세요.' :
      !formData.phone ? '휴대폰 번호를 입력해주세요.' :
      !isVerified ? '휴대폰 인증을 완료해주세요.' :
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
          phone: formData.phone.replace(/-/g, ''), // 하이픈 제거
          type: 'partner',
          terms: createTermsAgreements(),
          registrationComplete: false, // Step2 완료 후 true로 변경
          createdAt: new Date(),
          updatedAt: new Date()
        }, { merge: true })
      } else {
        // 일반 회원가입 - Firebase Auth 계정 생성
        try {
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
            phone: formData.phone.replace(/-/g, ''), // 하이픈 제거
            type: 'partner',
            terms: createTermsAgreements(),
            registrationComplete: false, // Step2 완료 후 true로 변경
            createdAt: new Date(),
            updatedAt: new Date()
          })
        } catch (authError: unknown) {
          // 이미 계정이 존재하는 경우 로그인 시도
          if (authError instanceof Error && 'code' in authError && authError.code === 'auth/email-already-in-use') {
            const { signInWithEmailAndPassword } = await import('firebase/auth')
            const userCredential = await signInWithEmailAndPassword(
              auth,
              formData.email,
              formData.password
            )
            uid = userCredential.user.uid

            // 회원가입 완료 여부 확인
            const { getDoc } = await import('firebase/firestore')
            const userRef = doc(db, 'users', uid)
            const userDoc = await getDoc(userRef)

            if (userDoc.exists() && userDoc.data().registrationComplete) {
              throw new Error('이미 회원가입이 완료된 계정입니다. 로그인 페이지로 이동해주세요.')
            }

            // registrationComplete가 false인 경우 Step2로 진행
            // users 컬렉션 정보 업데이트 (전화번호나 이름이 변경되었을 수 있음)
            await setDoc(userRef, {
              name: formData.name,
              phone: formData.phone.replace(/-/g, ''),
              updatedAt: new Date()
            }, { merge: true })
          } else {
            throw authError
          }
        }
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
    <AuthGuard requireAuth={false} requireCompleteRegistration={false}>
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

              {/* 연락처 */}
              <div className={styles.inputGroup}>
                <label htmlFor="phone" className={styles.label}>
                  연락처
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className={styles.inputNoIcon}
                    placeholder="'-' 없이 입력"
                    disabled={isVerified}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={!formData.phone || sendingCode || isVerified}
                    className={styles.verifyButton}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {isVerified ? '인증완료' : verificationSent ? '재발송' : '인증요청'}
                  </button>
                </div>

                {/* 인증번호 입력 */}
                {verificationSent && !isVerified && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className={styles.inputNoIcon}
                      placeholder="인증번호 6자리 입력"
                      maxLength={6}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={!verificationCode || verifyingCode || timer === 0}
                      className={styles.verifyButton}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      확인
                    </button>
                    {timer > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#ef4444',
                        fontWeight: '500',
                        minWidth: '45px'
                      }}>
                        {formatTimer(timer)}
                      </div>
                    )}
                  </div>
                )}
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
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}