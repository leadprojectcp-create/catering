'use client'

import { useEffect } from 'react'
import { getAuth, signInWithCredential, GoogleAuthProvider, OAuthProvider } from 'firebase/auth'

interface GoogleLoginResult {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  idToken: string
}

interface KakaoLoginResult {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
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
        await signInWithCredential(auth, credential)

        console.log('[NativeAuth] Google login successful')
      } catch (error) {
        console.error('[NativeAuth] Google login failed:', error)
        throw error
      }
    }

    // Kakao 로그인 핸들러 (향후 구현)
    window.handleNativeKakaoLogin = async (result: KakaoLoginResult) => {
      try {
        console.log('[NativeAuth] Kakao login started:', { uid: result.uid, email: result.email })

        const auth = getAuth()
        const credential = OAuthProvider.credential('oidc.kakao', result.idToken)
        await signInWithCredential(auth, credential)

        console.log('[NativeAuth] Kakao login successful')
      } catch (error) {
        console.error('[NativeAuth] Kakao login failed:', error)
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
