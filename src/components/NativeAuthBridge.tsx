'use client'

import { useEffect } from 'react'
import { getAuth, signInWithCredential, GoogleAuthProvider, OAuthProvider } from 'firebase/auth'
import { handleSocialUser } from '@/lib/auth'

interface GoogleLoginResult {
  uid: string
  email: string | null
  displayName: string | null
  idToken: string
}

interface KakaoLoginResult {
  uid: string
  email: string | null
  displayName: string | null
  idToken: string
}

declare global {
  interface Window {
    handleNativeGoogleLogin?: (result: GoogleLoginResult) => Promise<void>
    handleNativeKakaoLogin?: (result: KakaoLoginResult) => Promise<void>
  }
}

export default function NativeAuthBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Google 로그인 핸들러
    window.handleNativeGoogleLogin = async (result: GoogleLoginResult) => {
      try {
        console.log('[NativeAuth] Google login started:', { uid: result.uid, email: result.email })

        const auth = getAuth()
        const credential = GoogleAuthProvider.credential(result.idToken)
        const userCredential = await signInWithCredential(auth, credential)

        console.log('[NativeAuth] Firebase authentication successful')

        // 웹과 동일한 handleSocialUser 함수 사용
        // FCM 토큰은 handleSocialUser 내부에서 웹으로 자동 발급
        const socialResult = await handleSocialUser(
          userCredential.user,
          'google',
          {
            name: result.displayName,
            email: result.email
          }
        )

        console.log('[NativeAuth] handleSocialUser result:', socialResult)

        if (socialResult.success) {
          if ('isExistingUser' in socialResult && socialResult.isExistingUser && 'registrationComplete' in socialResult && socialResult.registrationComplete) {
            // 기존 사용자이고 가입이 완료된 경우 - 메인 페이지로 이동
            console.log('[NativeAuth] Existing user with complete registration, redirecting to home')
            window.location.href = '/'
          } else if ('isExistingUser' in socialResult && socialResult.isExistingUser && 'registrationComplete' in socialResult && !socialResult.registrationComplete) {
            // 기존 사용자이지만 가입이 완료되지 않은 경우 - 회원 타입 선택으로 이동
            console.log('[NativeAuth] Existing user with incomplete registration, redirecting to choose-type')
            window.location.href = '/signup/choose-type'
          } else if ('isExistingUser' in socialResult && !socialResult.isExistingUser) {
            // 신규 사용자 - 회원 타입 선택 페이지로 이동
            console.log('[NativeAuth] New user, redirecting to choose-type')
            window.location.href = '/signup/choose-type'
          }
        } else {
          // 에러 처리
          console.error('[NativeAuth] Social user handle failed:', socialResult.error)
          alert(socialResult.error || '로그인 중 오류가 발생했습니다.')
        }

        console.log('[NativeAuth] Google login successful')
      } catch (error) {
        console.error('[NativeAuth] Google login failed:', error)
        throw error
      }
    }

    // Kakao 로그인 핸들러
    window.handleNativeKakaoLogin = async (result: KakaoLoginResult) => {
      try {
        console.log('[NativeAuth] Kakao login started:', result)

        const auth = getAuth()
        // 앱에서는 oidc.kakao-app 사용 (Native App Key)
        const provider = new OAuthProvider('oidc.kakao-app')

        console.log('[NativeAuth] Creating credential with idToken:', result.idToken)

        const credential = provider.credential({
          idToken: result.idToken
        })

        console.log('[NativeAuth] Credential created, signing in...')

        const userCredential = await signInWithCredential(auth, credential)

        console.log('[NativeAuth] Firebase authentication successful')

        // 웹과 동일한 handleSocialUser 함수 사용
        // FCM 토큰은 handleSocialUser 내부에서 웹으로 자동 발급
        const socialResult = await handleSocialUser(
          userCredential.user,
          'kakao',
          {
            name: result.displayName,
            email: result.email
          }
        )

        console.log('[NativeAuth] handleSocialUser result:', socialResult)

        if (socialResult.success) {
          if ('isExistingUser' in socialResult && socialResult.isExistingUser && 'registrationComplete' in socialResult && socialResult.registrationComplete) {
            // 기존 사용자이고 가입이 완료된 경우 - 메인 페이지로 이동
            console.log('[NativeAuth] Existing user with complete registration, redirecting to home')
            window.location.href = '/'
          } else if ('isExistingUser' in socialResult && socialResult.isExistingUser && 'registrationComplete' in socialResult && !socialResult.registrationComplete) {
            // 기존 사용자이지만 가입이 완료되지 않은 경우 - 회원 타입 선택으로 이동
            console.log('[NativeAuth] Existing user with incomplete registration, redirecting to choose-type')
            window.location.href = '/signup/choose-type'
          } else if ('isExistingUser' in socialResult && !socialResult.isExistingUser) {
            // 신규 사용자 - 회원 타입 선택 페이지로 이동
            console.log('[NativeAuth] New user, redirecting to choose-type')
            window.location.href = '/signup/choose-type'
          }
        } else {
          // 에러 처리
          console.error('[NativeAuth] Social user handle failed:', socialResult.error)
          alert(socialResult.error || '카카오 로그인 중 오류가 발생했습니다.')
        }

        console.log('[NativeAuth] Kakao login successful')
      } catch (error) {
        console.error('[NativeAuth] Kakao login failed:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        alert(`카카오 로그인 실패: ${errorMessage}`)
        throw error
      }
    }

    return () => {
      // 클린업
      delete window.handleNativeGoogleLogin
      delete window.handleNativeKakaoLogin
    }
  }, [])

  return null
}
