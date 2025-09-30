'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { handleRedirectResult, signInWithGoogle, signInWithKakao } from '@/lib/auth'
import AuthGuard from './AuthGuard'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
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

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    setLoadingProvider(provider)
    setError('')

    try {
      let result
      switch (provider) {
        case 'google':
          result = await signInWithGoogle()
          break
        case 'kakao':
          result = await signInWithKakao()
          break
      }

      if (result.success) {
        if ('isRedirecting' in result && result.isRedirecting) {
          return
        } else if ('isExistingUser' in result && result.isExistingUser && 'registrationComplete' in result && result.registrationComplete) {
          router.push('/')
        } else if ('isExistingUser' in result && result.isExistingUser && 'registrationComplete' in result && !result.registrationComplete) {
          // 기존 소셜 사용자지만 가입이 완료되지 않음 - 회원 유형 선택부터 시작
          router.push('/signup/choose-type')
        } else if ('isExistingUser' in result && !result.isExistingUser) {
          // 신규 소셜 사용자 - 회원 유형 선택부터 시작
          router.push('/signup/choose-type')
        }
      } else {
        const errorMessage = 'error' in result ? (result.error || '로그인 중 오류가 발생했습니다.') : '로그인 중 오류가 발생했습니다.'
        setError(errorMessage)
      }
    } catch (error) {
      console.error(`${provider} login error:`, error)
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <Image
              src="/assets/logo.png"
              alt="PICKTOEAT"
              width={262}
              height={48}
              priority
            />
          </div>
          <div className={styles.subtitle}>
            단체주문 고민하지말고 픽투잇에서!
          </div>
          <div className={styles.description}>
            간식거리부터 식사까지<br />
            다양한 종류를 한곳에서 만나보세요.
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
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
                className={styles.input}
                placeholder="이메일을 입력해주세요"
              />
            </div>

            {/* 비밀번호 */}
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                비밀번호
              </label>
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
              {isLoading ? '로그인 중...' : '로그인하기'}
            </button>
          </div>

          <div className={styles.findSection}>
            <a href="#" className={styles.findLink}>아이디 찾기</a>
            <span className={styles.dividerBar}>|</span>
            <a href="#" className={styles.findLink}>비밀번호 재설정</a>
          </div>

          {/* 소셜 로그인 */}
          <div className={styles.otherMethods}>
            <div className={styles.socialSection}>
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={loadingProvider !== null || isLoading}
                className={`${styles.socialButton} ${styles.googleButton}`}
              >
                {loadingProvider === 'google' ? (
                  <div className={styles.spinner}></div>
                ) : (
                  <svg className={styles.socialIcon} viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                구글로 계속하기
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('kakao')}
                disabled={loadingProvider !== null || isLoading}
                className={`${styles.socialButton} ${styles.kakaoButton}`}
              >
                {loadingProvider === 'kakao' ? (
                  <div className={styles.spinner}></div>
                ) : (
                  <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="#000000">
                    <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
                  </svg>
                )}
                카카오톡으로 계속하기
              </button>

              <Link href="/signup/choose-type" className={`${styles.socialButton} ${styles.emailSignupButton}`}>
                <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="#333333">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                이메일로 가입하기
              </Link>
            </div>
          </div>

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