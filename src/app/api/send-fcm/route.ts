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

    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    })
  }
}

function getAdminDb() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFirestore } = require('firebase-admin/firestore')
  return getFirestore()
}

function getAdminMessaging() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getMessaging } = require('firebase-admin/messaging')
  return getMessaging()
}

export async function POST(request: NextRequest) {
  try {
    // Firebase Admin 초기화
    initializeFirebaseAdmin()
    const adminDb = getAdminDb()

    const { roomId, senderId, senderName, message } = await request.json()

    if (!roomId || !senderId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Realtime Database에서 채팅방 정보 가져오기
    const { getDatabase } = await import('firebase-admin/database')
    const realtimeDb = getDatabase()
    const roomRef = realtimeDb.ref(`chatRooms/${roomId}`)
    const roomSnapshot = await roomRef.once('value')

    if (!roomSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      )
    }

    const roomData = roomSnapshot.val()
    const participants = roomData.participants || []

    // 상대방 ID 찾기
    const recipientId = participants.find((id: string) => id !== senderId)

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Firestore에서 상대방의 FCM 토큰 가져오기
    const recipientDoc = await adminDb.collection('users').doc(recipientId).get()

    if (!recipientDoc.exists) {
      return NextResponse.json(
        { error: 'Recipient user not found' },
        { status: 404 }
      )
    }

    const recipientData = recipientDoc.data()
    const fcmToken = recipientData?.fcmToken

    if (!fcmToken) {
      console.log('[FCM] No FCM token for recipient:', recipientId)
      return NextResponse.json(
        { success: true, message: 'No FCM token available' },
        { status: 200 }
      )
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
