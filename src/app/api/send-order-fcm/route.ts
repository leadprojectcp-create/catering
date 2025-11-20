import { NextRequest, NextResponse } from 'next/server'

// Firebase Admin을 동적으로 import하여 빌드 시점 에러 방지
function initializeFirebaseAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApps } = require('firebase-admin/app')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFirestore } = require('firebase-admin/firestore')

  const app = getApps()[0]
  if (!app) {
    throw new Error('Firebase Admin이 초기화되지 않았습니다')
  }

  const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'catering'
  const db = getFirestore(app, databaseId)
  console.log('[getAdminDb] Firestore 데이터베이스 ID:', databaseId)
  return db
}

function getAdminMessaging() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApps } = require('firebase-admin/app')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getMessaging } = require('firebase-admin/messaging')

  const app = getApps()[0]
  return getMessaging(app)
}

export async function POST(request: NextRequest) {
  let userId: string | undefined
  let adminDb: ReturnType<typeof getAdminDb> | undefined

  try {
    console.log('[주문 FCM API] 요청 시작')

    // Firebase Admin 초기화
    initializeFirebaseAdmin()
    console.log('[주문 FCM API] Firebase Admin 초기화 완료')

    adminDb = getAdminDb()

    const { userId: requestUserId, title, body, data } = await request.json()
    userId = requestUserId

    console.log('[주문 FCM API] 요청 데이터:', { userId, title, body, data })

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Firestore에서 사용자의 FCM 토큰 가져오기
    console.log('[주문 FCM API] Firestore에서 사용자 FCM 토큰 조회 시작:', userId)

    let fcmToken = null

    try {
      const userDoc = await adminDb.collection('users').doc(userId).get()
      console.log('[주문 FCM API] Firestore 사용자 문서 조회 완료, exists:', userDoc.exists)

      if (userDoc.exists) {
        const userData = userDoc.data()
        fcmToken = userData?.fcmToken
        console.log('[주문 FCM API] Firestore에서 FCM 토큰 조회:', fcmToken ? '있음' : '없음')
      }
    } catch (firestoreError) {
      console.log('[주문 FCM API] Firestore 조회 실패:', firestoreError)
    }

    if (!fcmToken) {
      console.log('[주문 FCM] No FCM token for user:', userId)
      return NextResponse.json(
        { success: true, message: 'No FCM token available' },
        { status: 200 }
      )
    }

    // FCM 메시지 전송
    const messaging = getAdminMessaging()

    const fcmMessage = {
      token: fcmToken,
      data: {
        title: title,
        body: body,
        ...data
      },
      // Android 설정
      android: {
        priority: 'high' as const,
      },
      // iOS 설정
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: 'default',
            badge: 1,
            alert: {
              title: title,
              body: body
            }
          }
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert'
        }
      }
    }

    console.log('[주문 FCM] ========== FCM 전송 시작 ==========')
    console.log('[주문 FCM] 수신자 ID:', userId)
    console.log('[주문 FCM] 메시지 제목:', title)
    console.log('[주문 FCM] 메시지 내용:', body)
    console.log('[주문 FCM] 전송할 메시지 구조:', JSON.stringify(fcmMessage, null, 2))

    const response = await messaging.send(fcmMessage)

    console.log('[주문 FCM] ========== FCM 전송 성공 ==========')
    console.log('[주문 FCM] Message ID:', response)
    console.log('[주문 FCM] =======================================')

    return NextResponse.json(
      { success: true, messageId: response },
      { status: 200 }
    )
  } catch (error) {
    console.error('[주문 FCM] Error sending message:', error)
    console.error('[주문 FCM] Error type:', typeof error)
    console.error('[주문 FCM] Error name:', (error as Error)?.name)
    console.error('[주문 FCM] Error message:', (error as Error)?.message)
    console.error('[주문 FCM] Error stack:', (error as Error)?.stack)

    const errorMessage = (error as Error)?.message || ''

    // FCM 토큰이 유효하지 않은 경우 (만료, 삭제 등)
    if (
      errorMessage.includes('Requested entity was not found') ||
      errorMessage.includes('not a valid FCM registration token') ||
      errorMessage.includes('registration-token-not-registered')
    ) {
      console.log('[주문 FCM] 유효하지 않은 FCM 토큰 - Firestore에서 토큰 삭제:', userId)

      if (userId && adminDb) {
        try {
          await adminDb.collection('users').doc(userId).update({
            fcmToken: null
          })
          console.log('[주문 FCM] Firestore에서 토큰 삭제 완료')
        } catch (fsError) {
          console.error('[주문 FCM] Firestore 토큰 삭제 실패:', fsError)
        }
      }

      return NextResponse.json(
        { success: true, message: 'Invalid FCM token removed' },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to send FCM notification',
        details: String(error),
        errorMessage: errorMessage,
        errorName: (error as Error)?.name || 'Unknown'
      },
      { status: 500 }
    )
  }
}
