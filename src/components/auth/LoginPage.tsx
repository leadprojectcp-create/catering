'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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
    <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <div className={styles.brand}>
            TRIPJOY
          </div>
          <h2 className={styles.title}>
            로그인
          </h2>
          <p className={styles.subtitle}>
            계정이 없으신가요?{' '}
            <Link href="/signup" className={styles.signupLink}>
              회원가입하기
            </Link>
          </p>
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
          <div className={styles.divider}>
            <div className={styles.dividerLine}>
              <div className={styles.dividerBorder} />
            </div>
            <div className={styles.dividerText}>
              <span className={styles.dividerLabel}>또는</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              className={styles.socialButton}
              onClick={() => {
                // TODO: Google 로그인 구현
                console.log('Google 로그인')
              }}
            >
              <span className={styles.socialIcon}>🔍</span>
              Google로 로그인
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