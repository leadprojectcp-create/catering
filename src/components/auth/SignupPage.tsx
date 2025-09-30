'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signupUser } from '@/lib/auth'
import AuthGuard from './AuthGuard'
import styles from './SignupPage.module.css'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
        phone: formData.phone || undefined,
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
        </form>
      </div>
    </div>
    </AuthGuard>
  )
}