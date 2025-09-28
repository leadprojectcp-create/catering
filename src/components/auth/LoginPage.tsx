'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { handleRedirectResult } from '@/lib/auth'
import SocialLogin from './SocialLogin'
import AuthGuard from './AuthGuard'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // 소셜 로그인 리다이렉트 결과 처리 (Firebase 기본 핸들러 사용)
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await handleRedirectResult()
        if (result) {
          if (result.success) {
            if ('isExistingUser' in result && result.isExistingUser && 'registrationComplete' in result && result.registrationComplete) {
              router.push('/')
            } else {
              router.push('/signup/choose-type')
            }
          } else {
            setError(result.error || '소셜 로그인 중 오류가 발생했습니다.')
          }
        }
      } catch (error) {
        console.error('Redirect result check error:', error)
      }
    }

    checkRedirectResult()
  }, [router])

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

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password)
      alert('로그인 성공!')
      router.push('/')
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <div className={styles.brand}>
            TRIPJOY
          </div>
          <h2 className={styles.title}>
            로그인
          </h2>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            {/* 이메일 */}
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                이메일
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
                  placeholder="이메일을 입력해주세요"
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                비밀번호
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
                  placeholder="비밀번호를 입력해주세요"
                />
              </div>
            </div>
          </div>

          <div className={styles.rememberSection}>
            <div className={styles.checkboxGroup}>
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className={styles.checkbox}
              />
              <label htmlFor="remember-me" className={styles.checkboxLabel}>
                로그인 상태 유지
              </label>
            </div>

            <div>
              <a href="#" className={styles.forgotLink}>
                비밀번호를 잊으셨나요?
              </a>
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
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>

          {/* 소셜 로그인 */}
          <SocialLogin onError={setError} />

          <div className={styles.homeLink}>
            <Link href="/" className={styles.homeLinkText}>
              홈으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
    </AuthGuard>
  )
}