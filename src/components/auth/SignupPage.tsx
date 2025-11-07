'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { signupUser } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import AuthGuard from './AuthGuard'
import styles from './SignupPage.module.css'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const selectedType = searchParams.get('type') as 'user' | 'partner' | null

  // 약관 동의 정보 받기
  const termsAgreements = {
    service: searchParams.get('terms') === 'true',
    privacy: searchParams.get('privacy') === 'true',
    marketing: searchParams.get('marketing') === 'true'
  }

  // 디버깅을 위한 로그
  console.log('URL searchParams:', {
    terms: searchParams.get('terms'),
    privacy: searchParams.get('privacy'),
    thirdparty: searchParams.get('thirdparty'),
    marketing: searchParams.get('marketing'),
    type: searchParams.get('type')
  })
  console.log('parsed termsAgreements:', termsAgreements)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    companyName: '',
    phone: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // SMS 인증 관련 상태
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [timer, setTimer] = useState(0)

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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // 전화번호 변경 시 인증 초기화
    if (e.target.name === 'phone') {
      setIsVerified(false)
      setVerificationSent(false)
      setVerificationCode('')
      setTimer(0)
    }
  }

  // 인증번호 발송
  const handleSendVerification = async () => {
    if (!formData.phone) {
      alert('전화번호를 입력해주세요.')
      return
    }

    setIsSending(true)
    setError('')

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formData.phone }),
      })

      const data = await response.json()

      if (data.success) {
        alert('인증번호가 발송되었습니다.')
        setVerificationSent(true)
        setTimer(300) // 5분
      } else {
        setError(data.error || '인증번호 발송에 실패했습니다.')
      }
    } catch (error) {
      console.error('인증번호 발송 실패:', error)
      setError('인증번호 발송 중 오류가 발생했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  // 인증번호 확인
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      alert('인증번호를 입력해주세요.')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const response = await fetch('/api/sms/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formData.phone, code: verificationCode }),
      })

      const data = await response.json()

      if (data.success) {
        alert('인증이 완료되었습니다.')
        setIsVerified(true)
        setTimer(0)
      } else {
        setError(data.error || '인증번호가 일치하지 않습니다.')
      }
    } catch (error) {
      console.error('인증 실패:', error)
      setError('인증 중 오류가 발생했습니다.')
    } finally {
      setIsVerifying(false)
    }
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
    setIsLoading(true)

    // 전화번호 인증 확인
    if (!isVerified) {
      setError('전화번호 인증을 완료해주세요.')
      setIsLoading(false)
      return
    }

    const validationError =
      formData.password !== formData.confirmPassword ? '비밀번호가 일치하지 않습니다.' :
      formData.password.length < 6 ? '비밀번호는 6자 이상이어야 합니다.' :
      null

    if (validationError) {
      setError(validationError)
      setIsLoading(false)
      return
    }

    try {
      console.log('Calling signupUser...')
      console.log('formData:', formData)
      console.log('termsAgreements:', termsAgreements)
      console.log('selectedType:', selectedType)

      const signupUserData = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        companyName: formData.companyName || undefined,
        phone: formData.phone ? formData.phone.replace(/-/g, '') : undefined, // 하이픈 제거
        type: selectedType || 'user',
        termsAgreements
      }

      console.log('Full signupUserData to be sent:', signupUserData)

      const result = await signupUser(signupUserData)

      console.log('signupUser result:', result)

      if (result.success) {
        alert('회원가입이 완료되었습니다!')
        router.push('/login')
      } else {
        setError(result.error || '회원가입 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Caught error:', error)
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      console.log('Setting loading to false')
      setIsLoading(false)
    }
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            회원가입을 위해<br />
            정보를 입력해주세요
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
                placeholder="홍길동"
              />
            </div>

            {/* 이메일 */}
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={styles.inputNoIcon}
                placeholder="example@company.com"
              />
            </div>

            {/* 연락처 */}
            <div className={styles.inputGroup}>
              <label htmlFor="phone" className={styles.label}>
                연락처 {isVerified && <span style={{color: '#4CAF50', fontSize: '14px', marginLeft: '8px'}}>✓ 인증완료</span>}
              </label>
              <div style={{display: 'flex', gap: '8px'}}>
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
                  style={{flex: 1}}
                />
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isSending || isVerified || !formData.phone}
                  className={styles.verifyButton}
                >
                  {isSending ? '발송중...' : verificationSent ? '재발송' : '인증번호'}
                </button>
              </div>
            </div>

            {/* 인증번호 입력 */}
            {verificationSent && !isVerified && (
              <div className={styles.inputGroup}>
                <label htmlFor="verificationCode" className={styles.label}>
                  인증번호
                  {timer > 0 && (
                    <span style={{color: '#FF5722', fontSize: '14px', marginLeft: '8px'}}>
                      {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                    </span>
                  )}
                </label>
                <div style={{display: 'flex', gap: '8px'}}>
                  <input
                    id="verificationCode"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className={styles.inputNoIcon}
                    placeholder="인증번호 6자리"
                    maxLength={6}
                    style={{flex: 1}}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={isVerifying || !verificationCode}
                    className={styles.verifyButton}
                  >
                    {isVerifying ? '확인중...' : '확인'}
                  </button>
                </div>
              </div>
            )}

            {/* 비밀번호 */}
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
                  placeholder="6자 이상 입력해주세요"
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
                  placeholder="비밀번호를 다시 입력해주세요"
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
{isLoading ? '가입 중...' : '회원가입'}
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