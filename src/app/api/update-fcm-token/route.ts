import { NextRequest, NextResponse } from 'next/server'

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

function getAdminDatabase() {
  const { getApps } = require('firebase-admin/app')
  const { getDatabase } = require('firebase-admin/database')

  const app = getApps()[0]
  return getDatabase(app)
}

/**
 * FCM 토큰을 Firestore와 Realtime Database에 업데이트하는 API
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

    const db = getAdminDb()
    const realtimeDb = getAdminDatabase()

    // Firestore 업데이트
    try {
      await db.collection('users').doc(userId).update({
        fcmToken: fcmToken,
        fcmTokenUpdatedAt: new Date(),
      })
      console.log('[Update FCM Token] Firestore updated successfully')
    } catch (firestoreError) {
      console.error('[Update FCM Token] Firestore update failed:', firestoreError)
      // Firestore 업데이트 실패해도 계속 진행
    }

    // Realtime Database 업데이트
    try {
      await realtimeDb.ref(`users/${userId}/fcmToken`).set(fcmToken)
      console.log('[Update FCM Token] Realtime Database updated successfully')
    } catch (rtdbError) {
      console.error('[Update FCM Token] Realtime Database update failed:', rtdbError)
      // Realtime Database 업데이트 실패해도 계속 진행
    }

    console.log('[Update FCM Token] Token updated successfully in both databases')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Update FCM Token] Error:', error)
    return NextResponse.json(
      { error: '토큰 업데이트 실패' },
      { status: 500 }
    )
  }
}
