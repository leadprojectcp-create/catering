import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getDatabase } from 'firebase/database'
import type { Analytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
}

// Firebase 앱 초기화 (한 번만 실행)
let app: ReturnType<typeof initializeApp>
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
} catch (error) {
  console.error('Firebase 초기화 실패:', error)
  throw error
}

// Firebase 서비스 초기화 (앱 인스턴스 재사용)
export const auth = getAuth(app)
export const db = getFirestore(app, 'catering')
export const storage = getStorage(app)
export const realtimeDb = getDatabase(app)

// Analytics 지연 초기화 (installations 에러 방지)
export let analytics: Analytics | null = null

// Analytics를 필요할 때만 초기화하는 함수
export const initializeAnalyticsIfNeeded = async () => {
  if (typeof window !== 'undefined' && !analytics) {
    try {
      // 페이지 로드 후 3초 뒤에 초기화 (installations API 안정화 대기)
      setTimeout(async () => {
        const { getAnalytics } = await import('firebase/analytics')
        analytics = getAnalytics(app)
      }, 3000)
    } catch {
      // Analytics 실패는 무시
    }
  }
}

export default app

// For development, connect to Firestore emulator if available
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
}