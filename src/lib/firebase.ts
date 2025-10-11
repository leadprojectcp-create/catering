import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'
import { getAnalytics, Analytics } from 'firebase/analytics'
import { getDatabase, Database } from 'firebase/database'

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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Firebase 서비스 초기화 (앱 인스턴스 재사용)
export const auth = getAuth(app)
export const db = getFirestore(app, 'catering')
export const storage = getStorage(app)
export const realtimeDb = getDatabase(app)

// Analytics 초기화 (브라우저에서만, 실패해도 무시)
export let analytics: Analytics | null = null
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app)
  } catch (error) {
    // Analytics 실패는 무시 (installations 에러 방지)
  }
}

export default app

// For development, connect to Firestore emulator if available
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
}

export default app