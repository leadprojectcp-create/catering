import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'
import { getDatabase } from 'firebase/database'

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

// 필수 설정 확인
if (typeof window !== 'undefined' && !firebaseConfig.apiKey) {
  console.error('Firebase 설정이 없습니다. .env.local 파일을 확인하세요.')
}

// Initialize Firebase (재사용 가능하도록)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app, 'catering')  // Use 'catering' database
export const storage = getStorage(app)
export const realtimeDb = getDatabase(app)

// Initialize Analytics (only in browser)
let analytics: ReturnType<typeof getAnalytics> | null = null
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app)
  } catch (error) {
    console.warn('Firebase Analytics 초기화 실패:', error)
    // Analytics 실패는 치명적이지 않으므로 계속 진행
  }
}
export { analytics }

// For development, connect to Firestore emulator if available
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
}

export default app