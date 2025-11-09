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

function getAdminDb() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApps } = require('firebase-admin/app')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFirestore } = require('firebase-admin/firestore')

  const app = getApps()[0]
  if (!app) {
    throw new Error('Firebase Admin이 초기화되지 않았습니다')
  }

  // Firestore 데이터베이스 ID: 환경 변수에서 가져오기
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

function getAdminDatabase() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApps } = require('firebase-admin/app')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDatabase } = require('firebase-admin/database')

  const app = getApps()[0]
  return getDatabase(app)
}

export async function POST(request: NextRequest) {
  try {
    console.log('[FCM API] 요청 시작')

    // Firebase Admin 초기화
    initializeFirebaseAdmin()
    console.log('[FCM API] Firebase Admin 초기화 완료')

    const adminDb = getAdminDb()

    const { roomId, senderId, senderName, message } = await request.json()
    console.log('[FCM API] 요청 데이터:', { roomId, senderId, senderName, message })

    if (!roomId || !senderId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Realtime Database에서 채팅방 정보 가져오기
    console.log('[FCM API] Realtime Database 접근 시작')
    let realtimeDb
    try {
      realtimeDb = getAdminDatabase()
      console.log('[FCM API] Database 인스턴스 생성 완료')
    } catch (dbError) {
      console.error('[FCM API] Database 인스턴스 생성 실패:', dbError)
      throw dbError
    }

    console.log('[FCM API] Database URL:', process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL)
    const roomRef = realtimeDb.ref(`chatRooms/${roomId}`)
    console.log('[FCM API] 채팅방 조회 경로:', `chatRooms/${roomId}`)

    let roomSnapshot
    try {
      roomSnapshot = await roomRef.once('value')
      console.log('[FCM API] 채팅방 존재 여부:', roomSnapshot.exists())
    } catch (snapshotError) {
      console.error('[FCM API] 채팅방 조회 실패:', snapshotError)
      throw snapshotError
    }

    if (!roomSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      )
    }

    const roomData = roomSnapshot.val()
    const participants = roomData.participants || []
    console.log('[FCM API] 채팅방 참가자:', participants)

    // 상대방 ID 찾기
    const recipientId = participants.find((id: string) => id !== senderId)
    console.log('[FCM API] 수신자 ID:', recipientId)

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Firestore 또는 Realtime Database에서 상대방의 FCM 토큰 가져오기
    console.log('[FCM API] 사용자 FCM 토큰 조회 시작:', recipientId)

    let fcmToken = null

    // 먼저 Realtime Database에서 시도
    try {
      const userRef = realtimeDb.ref(`users/${recipientId}`)
      const userSnapshot = await userRef.once('value')

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val()
        fcmToken = userData?.fcmToken
        console.log('[FCM API] Realtime Database에서 FCM 토큰 조회:', fcmToken ? '있음' : '없음')
      }
    } catch (rtdbError) {
      console.log('[FCM API] Realtime Database 조회 실패, Firestore 시도:', rtdbError)
    }

    // Realtime Database에 없으면 Firestore 시도
    if (!fcmToken) {
      try {
        console.log('[FCM API] Firestore에서 사용자 조회 시작:', recipientId)
        const recipientDoc = await adminDb.collection('users').doc(recipientId).get()
        console.log('[FCM API] Firestore 사용자 문서 조회 완료, exists:', recipientDoc.exists)

        if (recipientDoc.exists) {
          const recipientData = recipientDoc.data()
          fcmToken = recipientData?.fcmToken
          console.log('[FCM API] Firestore에서 FCM 토큰 조회:', fcmToken ? '있음' : '없음')
        }
      } catch (firestoreError) {
        console.log('[FCM API] Firestore 조회 실패:', firestoreError)
      }
    }

    if (!fcmToken) {
      console.log('[FCM] No FCM token for recipient:', recipientId)
      return NextResponse.json(
        { success: true, message: 'No FCM token available' },
        { status: 200 }
      )
    }

    // 수신자의 활성 채팅방 확인 (해당 채팅방이 활성화되어 있으면 알림 전송 안 함)
    try {
      const activeRoomRef = realtimeDb.ref(`users/${recipientId}/activeRoomId`)
      const activeRoomSnapshot = await activeRoomRef.once('value')

      if (activeRoomSnapshot.exists()) {
        const activeRoomId = activeRoomSnapshot.val()
        console.log('[FCM API] 수신자의 활성 채팅방:', activeRoomId)

        if (activeRoomId === roomId) {
          console.log('[FCM API] 수신자가 해당 채팅방에 있음 - 알림 전송 안 함')
          return NextResponse.json(
            { success: true, message: 'Recipient is in the chat room' },
            { status: 200 }
          )
        }
      }
    } catch (activeRoomError) {
      console.log('[FCM API] 활성 채팅방 확인 실패 (알림은 전송):', activeRoomError)
    }

    // 메시지 내용 가공 (이미지, 상품 메시지 처리)
    let notificationBody = message
    if (message.startsWith('[이미지]')) {
      notificationBody = '📷 사진을 보냈습니다'
    } else if (message.startsWith('[상품]')) {
      notificationBody = '🏷️ 상품을 공유했습니다'
    }

    // FCM 메시지 전송
    const messaging = getAdminMessaging()
    const fcmMessage = {
      token: fcmToken,
      notification: {
        title: senderName || '새 메시지',
        body: notificationBody
      },
      data: {
        roomId: roomId,
        senderId: senderId,
        senderName: senderName || '',
        type: 'chat'
      },
      // Android 설정 (포그라운드, 백그라운드, 종료 상태 모두 처리)
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'chat_messages',
          priority: 'high' as const,
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      // iOS 설정 (포그라운드, 백그라운드, 종료 상태 모두 처리)
      apns: {
        payload: {
          aps: {
            alert: {
              title: senderName || '새 메시지',
              body: notificationBody
            },
            sound: 'default',
            badge: 1,
            contentAvailable: true
          }
        },
        headers: {
          'apns-priority': '10'
        }
      }
    }

    const response = await messaging.send(fcmMessage)
    console.log('[FCM] Message sent successfully:', response)

    return NextResponse.json(
      { success: true, messageId: response },
      { status: 200 }
    )
  } catch (error) {
    console.error('[FCM] Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send FCM notification', details: String(error) },
      { status: 500 }
    )
  }
}
