'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Mail, Lock, Building } from 'lucide-react'
import { signupUser } from '@/lib/auth'
import styles from './SignupPage.module.css'

export default function SignupPage() {
  const router = useRouter()
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
      const result = await signupUser({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        companyName: formData.companyName || undefined,
        phone: formData.phone || undefined
      })

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
    <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            회원가입
          </h2>
          <p className={styles.subtitle}>
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className={styles.loginLink}>
              로그인하기
            </Link>
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            {/* 이름 */}
            <div className={styles.inputGroup}>
              <label htmlFor="name" className={styles.label}>
                이름 *
              </label>
              <div className={styles.inputWrapper}>
                <User className={styles.inputIcon} />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="홍길동"
                />
              </div>
            </div>

            {/* 이메일 */}
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                이메일 *
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="example@company.com"
                />
              </div>
            </div>

            {/* 회사명 */}
            <div className={styles.inputGroup}>
              <label htmlFor="companyName" className={styles.label}>
                회사/단체명
              </label>
              <div className={styles.inputWrapper}>
                <Building className={styles.inputIcon} />
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="회사명 (선택사항)"
                />
              </div>
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
                value={formData.phone}
                onChange={handleChange}
                className={styles.inputNoIcon}
                placeholder="010-1234-5678"
              />
            </div>

            {/* 비밀번호 */}
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                비밀번호 *
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="6자 이상 입력해주세요"
                />
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                비밀번호 확인 *
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="비밀번호를 다시 입력해주세요"
                />
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

          <div className={styles.homeLink}>
            <Link href="/" className={styles.homeLinkText}>
              홈으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}