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

/**
 * FCM 토큰을 Firestore에 업데이트하는 API
 * 토큰 갱신 시 자동으로 호출됩니다.
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

    const db = getAdminDb()

    // Firestore 업데이트
    await db.collection('users').doc(userId).update({
      fcmToken: fcmToken,
      fcmTokenUpdatedAt: new Date(),
    })

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
