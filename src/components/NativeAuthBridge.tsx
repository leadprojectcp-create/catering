'use client'

import { useEffect } from 'react'
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth'

export default function NativeAuthBridge() {
  useEffect(() => {
    // 네이티브 앱 Google 로그인 결과 처리
    if (typeof window !== 'undefined') {
      (window as any).handleNativeGoogleLogin = async function(result: any) {
        console.log('[Native] Received:', result)
        try {
          const auth = getAuth()
          const credential = GoogleAuthProvider.credential(result.idToken)
          await signInWithCredential(auth, credential)
          console.log('[Native] Signed in')
        } catch (error) {
          console.error('[Native] Error:', error)
        }
      }
    }
  }, [])

  return null
}
