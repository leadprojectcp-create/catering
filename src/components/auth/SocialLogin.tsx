'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signInWithGoogle, signInWithKakao } from '@/lib/auth'
import styles from './SocialLogin.module.css'

interface SocialLoginProps {
  onError?: (error: string) => void
}

export default function SocialLogin({ onError }: SocialLoginProps) {
  const router = useRouter()
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    setLoadingProvider(provider)

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
          // 웹뷰 환경에서 리다이렉트 중 - 아무것도 하지 않음 (페이지가 리다이렉트됨)
          return
        } else if ('isExistingUser' in result && result.isExistingUser && 'registrationComplete' in result && result.registrationComplete) {
          // 기존 사용자이고 가입이 완료된 경우 - 메인 페이지로 이동
          router.push('/')
        } else if ('isExistingUser' in result && result.isExistingUser && 'registrationComplete' in result && !result.registrationComplete) {
          // 기존 사용자이지만 가입이 완료되지 않은 경우 - 회원 타입 선택으로 이동
          router.push('/signup/choose-type')
        } else if ('isExistingUser' in result && !result.isExistingUser) {
          // 신규 사용자 - 회원 타입 선택 페이지로 이동
          router.push('/signup/choose-type')
        }
      } else {
        const errorMessage = 'error' in result ? (result.error || '로그인 중 오류가 발생했습니다.') : '로그인 중 오류가 발생했습니다.'
        onError?.(errorMessage)
      }
    } catch (error) {
      console.error(`${provider} login error:`, error)
      onError?.('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.divider}>
        <span className={styles.dividerText}>또는</span>
      </div>

      {/* 이메일로 가입하기 버튼 */}
      <div className={styles.emailSignupSection}>
        <Link href="/signup" className={styles.emailSignupButton}>
          이메일로 가입하기
        </Link>
      </div>

      <div className={styles.socialButtons}>
        {/* 구글 로그인 */}
        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          disabled={loadingProvider !== null}
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
          구글로 로그인
        </button>

        {/* 카카오톡 로그인 */}
        <button
          type="button"
          onClick={() => handleSocialLogin('kakao')}
          disabled={loadingProvider !== null}
          className={`${styles.socialButton} ${styles.kakaoButton}`}
        >
          {loadingProvider === 'kakao' ? (
            <div className={styles.spinner}></div>
          ) : (
            <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="#000000">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
            </svg>
          )}
          카카오톡으로 로그인
        </button>

      </div>
    </div>
  )
}