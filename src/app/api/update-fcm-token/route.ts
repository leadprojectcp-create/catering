import { NextRequest, NextResponse } from 'next/server'

// Firebase Admin을 동적으로 import하여 빌드 시점 에러 방지
function initializeFirebaseAdmin() {
  const { initializeApp, getApps, cert } = require('firebase-admin/app')

  if (!getApps().length) {
    const serviceAccount: {
      projectId: string
      clientEmail: string
      privateKey: string
    } = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
    }

    const app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    })

    console.log('[Firebase Admin] 초기화됨, Project ID:', app.options.projectId)
  }
}

function getAdminDb(): ReturnType<typeof import('firebase-admin/firestore').getFirestore> {
  const { getApps } = require('firebase-admin/app')
  const { getFirestore } = require('firebase-admin/firestore')

  const app = getApps()[0]
  if (!app) {
    throw new Error('Firebase Admin이 초기화되지 않았습니다')
  }

  const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'catering'
  const db = getFirestore(app, databaseId)
  return db
}

/**
 * FCM 토큰을 Firestore에 업데이트하는 API
 * 토큰 갱신 시 또는 네이티브 앱에서 자동으로 호출됩니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, fcmToken } = await request.json()

    if (!userId || !fcmToken) {
      return NextResponse.json(
        { error: 'userId와 fcmToken이 필요합니다' },
        { status: 400 }
      )
    }

    console.log('[Update FCM Token] Updating token for user:', userId)
    console.log('[Update FCM Token] Token:', fcmToken.substring(0, 30) + '...')

    // Firebase Admin 초기화
    initializeFirebaseAdmin()
    console.log('[Update FCM Token] Firebase Admin 초기화 완료')

    const db = getAdminDb()

    // Firestore에 FCM 토큰 저장 (문서가 없으면 생성, 있으면 병합)
    await db.collection('users').doc(userId).set({
      fcmToken: fcmToken,
      fcmTokenUpdatedAt: new Date(),
    }, { merge: true })

    console.log('[Update FCM Token] Token updated successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Update FCM Token] Error:', error)
    return NextResponse.json(
      { error: '토큰 업데이트 실패' },
      { status: 500 }
    )
  }
}
