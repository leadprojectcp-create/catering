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
  let recipientId: string | undefined
  let adminDb: ReturnType<typeof getAdminDb> | undefined

  try {
    console.log('[FCM API] 요청 시작')

    // Firebase Admin 초기화
    initializeFirebaseAdmin()
    console.log('[FCM API] Firebase Admin 초기화 완료')

    adminDb = getAdminDb()

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
    recipientId = participants.find((id: string) => id !== senderId)
    console.log('[FCM API] 수신자 ID:', recipientId)

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Firestore에서 상대방의 FCM 토큰 가져오기 (사용자 정보는 Firestore에만 저장됨)
    console.log('[FCM API] Firestore에서 사용자 FCM 토큰 조회 시작:', recipientId)

    let fcmToken = null

    try {
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

    if (!fcmToken) {
      console.log('[FCM] No FCM token for recipient:', recipientId)
      return NextResponse.json(
        { success: true, message: 'No FCM token available' },
        { status: 200 }
      )
    }

    // 수신자의 활성 채팅방 확인 (해당 채팅방이 활성화되어 있으면 알림 전송 안 함)
    try {
      const activeRoomRef = realtimeDb.ref(`users/${recipientId}/activeRoom`)
      const activeRoomSnapshot = await activeRoomRef.once('value')

      if (activeRoomSnapshot.exists()) {
        const activeRoomData = activeRoomSnapshot.val()
        console.log('[FCM API] 수신자의 활성 채팅방 데이터:', activeRoomData)

        const activeRoomId = activeRoomData?.roomId
        const lastActiveTimestamp = activeRoomData?.timestamp

        if (activeRoomId === roomId && lastActiveTimestamp) {
          // 타임스탬프 확인 (10초 이내면 활성 상태로 간주)
          const now = Date.now()
          const timeDiff = now - lastActiveTimestamp

          if (timeDiff < 10000) {
            console.log('[FCM API] 수신자가 해당 채팅방에 있음 - 알림 전송 안 함 (타임스탬프 차이:', timeDiff, 'ms)')
            return NextResponse.json(
              { success: true, message: 'Recipient is in the chat room' },
              { status: 200 }
            )
          } else {
            console.log('[FCM API] 타임스탬프가 오래됨 - 알림 전송 (타임스탬프 차이:', timeDiff, 'ms)')
          }
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

    // 수신자의 읽지 않은 메시지 수 계산 (뱃지용)
    let unreadCount = 1 // 기본값
    try {
      const userChatsRef = realtimeDb.ref(`userChats/${recipientId}`)
      const userChatsSnapshot = await userChatsRef.once('value')

      if (userChatsSnapshot.exists()) {
        const userChats = userChatsSnapshot.val()
        unreadCount = 0

        // 모든 채팅방의 읽지 않은 메시지 수 합산
        for (const chatRoomId in userChats) {
          const chatData = userChats[chatRoomId]
          if (chatData.unreadCount && typeof chatData.unreadCount === 'number') {
            unreadCount += chatData.unreadCount
          }
        }

        // 현재 메시지도 포함 (아직 DB에 반영되지 않았으므로)
        unreadCount += 1

        console.log('[FCM API] 계산된 읽지 않은 메시지 수:', unreadCount)
      }
    } catch (unreadError) {
      console.log('[FCM API] 읽지 않은 메시지 수 계산 실패 (기본값 1 사용):', unreadError)
    }

    // FCM 메시지 전송
    const messaging = getAdminMessaging()

    // iOS와 Android 모두 data 필드 사용
    // iOS: data + APNS payload로 알림 표시
    // Android: data로 Notifee가 알림 표시
    const fcmMessage = {
      token: fcmToken,
      data: {
        roomId: roomId,
        senderId: senderId,
        senderName: senderName || '',
        message: notificationBody,
        type: 'chat',
        title: senderName || '새 메시지',
        body: notificationBody
      },
      // Android 설정
      android: {
        priority: 'high' as const,
      },
      // iOS 설정 - alert로 알림 표시
      apns: {
        payload: {
          aps: {
            alert: {
              title: senderName || '새 메시지',
              body: notificationBody
            },
            sound: 'default',
            badge: unreadCount
          }
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert'
        }
      }
    }

    console.log('[FCM] ========== FCM 전송 시작 ==========')
    console.log('[FCM] 수신자 ID:', recipientId)
    console.log('[FCM] 수신자 FCM 토큰 (전체):', fcmToken)
    console.log('[FCM] 메시지 제목:', senderName || '새 메시지')
    console.log('[FCM] 메시지 내용:', notificationBody)
    console.log('[FCM] 전송할 메시지 구조:', JSON.stringify(fcmMessage, null, 2))

    const response = await messaging.send(fcmMessage)

    console.log('[FCM] ========== FCM 전송 성공 ==========')
    console.log('[FCM] Message ID:', response)
    console.log('[FCM] 이제 수신자의 앱/웹에서 알림을 받아야 합니다!')
    console.log('[FCM] =======================================')

    return NextResponse.json(
      { success: true, messageId: response },
      { status: 200 }
    )
  } catch (error) {
    console.error('[FCM] Error sending message:', error)
    console.error('[FCM] Error type:', typeof error)
    console.error('[FCM] Error name:', (error as Error)?.name)
    console.error('[FCM] Error message:', (error as Error)?.message)
    console.error('[FCM] Error stack:', (error as Error)?.stack)

    const errorMessage = (error as Error)?.message || ''

    // FCM 토큰이 유효하지 않은 경우 (만료, 삭제 등)
    if (
      errorMessage.includes('Requested entity was not found') ||
      errorMessage.includes('not a valid FCM registration token') ||
      errorMessage.includes('registration-token-not-registered')
    ) {
      console.log('[FCM] 유효하지 않은 FCM 토큰 - Firestore에서 토큰 삭제:', recipientId)

      // recipientId와 adminDb가 존재하는 경우에만 토큰 삭제
      if (recipientId && adminDb) {
        // Firestore에서 만료된 토큰 삭제 (사용자 정보는 Firestore에만 저장됨)
        try {
          await adminDb.collection('users').doc(recipientId).update({
            fcmToken: null
          })
          console.log('[FCM] Firestore에서 토큰 삭제 완료')
        } catch (fsError) {
          console.error('[FCM] Firestore 토큰 삭제 실패:', fsError)
        }
      }

      // 클라이언트에는 성공으로 반환 (메시지는 전송되었으므로)
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
