import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

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

/**
 * FCM 푸시 알림 발송 함수
 */
async function sendFcmNotification(
  adminDb: ReturnType<typeof getAdminDb>,
  userId: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Firestore에서 사용자의 FCM 토큰 조회
    const userDoc = await adminDb.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      console.log('[자동 구매확정 FCM] 사용자 문서 없음:', userId)
      return { success: true, error: 'User not found' }
    }

    const userData = userDoc.data()
    const fcmToken = userData?.fcmToken

    if (!fcmToken) {
      console.log('[자동 구매확정 FCM] FCM 토큰 없음:', userId)
      return { success: true, error: 'No FCM token' }
    }

    const messaging = getAdminMessaging()

    const fcmMessage = {
      token: fcmToken,
      data: {
        title,
        body,
        path: '/orders',
        ...data
      },
      android: {
        priority: 'high' as const,
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: 'default',
            badge: 1,
            alert: {
              title,
              body
            }
          }
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert'
        }
      }
    }

    const response = await messaging.send(fcmMessage)
    console.log('[자동 구매확정 FCM] 전송 성공, Message ID:', response)
    return { success: true, messageId: response }

  } catch (error) {
    const errorMessage = (error as Error)?.message || ''
    console.error('[자동 구매확정 FCM] 전송 실패:', errorMessage)

    // 유효하지 않은 FCM 토큰인 경우 삭제
    if (
      errorMessage.includes('Requested entity was not found') ||
      errorMessage.includes('not a valid FCM registration token') ||
      errorMessage.includes('registration-token-not-registered')
    ) {
      try {
        await adminDb.collection('users').doc(userId).update({
          fcmToken: null
        })
        console.log('[자동 구매확정 FCM] 유효하지 않은 토큰 삭제:', userId)
      } catch (fsError) {
        console.error('[자동 구매확정 FCM] 토큰 삭제 실패:', fsError)
      }
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * 자동 구매확정 API
 * - Cloud Tasks에서 예약일시 + 3일 후 호출
 * - 이미 구매확정된 경우 스킵
 * - 자동으로 orderStatus를 completed로 변경
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    console.log('[자동 구매확정 API] 요청:', { orderId })

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 주문 조회
    const orderRef = doc(db, 'orders', orderId)
    const orderSnap = await getDoc(orderRef)

    if (!orderSnap.exists()) {
      console.log('[자동 구매확정 API] 주문을 찾을 수 없음:', orderId)
      return NextResponse.json({
        success: true,
        message: '주문을 찾을 수 없습니다.',
        skipped: true
      })
    }

    const orderData = orderSnap.data()

    // 이미 구매확정된 경우 스킵
    if (orderData.orderStatus === 'completed' || orderData.confirmedAt) {
      console.log('[자동 구매확정 API] 이미 구매확정됨, 스킵:', orderId)
      return NextResponse.json({
        success: true,
        message: '이미 구매확정되어 자동완료를 스킵합니다.',
        skipped: true
      })
    }

    // 취소된 주문인 경우 스킵
    if (['cancelled', 'cancelled_before_accept', 'rejected'].includes(orderData.orderStatus)) {
      console.log('[자동 구매확정 API] 취소된 주문, 스킵:', orderId, orderData.orderStatus)
      return NextResponse.json({
        success: true,
        message: '취소된 주문이어서 자동완료를 스킵합니다.',
        skipped: true
      })
    }

    // shipping 상태가 아니면 스킵 (pending, preparing 상태에서는 자동완료 불가)
    if (orderData.orderStatus !== 'shipping') {
      console.log('[자동 구매확정 API] shipping 상태 아님, 스킵:', orderId, orderData.orderStatus)
      return NextResponse.json({
        success: true,
        message: '배송중 상태가 아니어서 자동완료를 스킵합니다.',
        skipped: true
      })
    }

    // 자동 구매확정 처리
    await updateDoc(orderRef, {
      orderStatus: 'completed',
      confirmedAt: serverTimestamp(),
      confirmationType: 'auto',  // 시스템 자동 확정
      settlementStatus: 'pending',  // 정산 대기 상태로 변경
      updatedAt: serverTimestamp()
    })

    console.log('[자동 구매확정 API] 자동 구매확정 완료:', orderId)

    // Firebase Admin 초기화
    initializeFirebaseAdmin()
    const adminDb = getAdminDb()

    // 소비자 정보 조회 (알림톡용)
    const userRef = doc(db, 'users', orderData.uid)
    const userSnap = await getDoc(userRef)
    const userData = userSnap.exists() ? userSnap.data() : null

    const phone = orderData.phone || userData?.phone

    // 알림톡 발송
    if (phone) {
      try {
        const alimtalkResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/alimtalk/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            templateCode: 'ORDER_AUTO_CONFIRMED',  // TODO: 실제 템플릿 코드로 변경
            variables: {
              storeName: orderData.storeName,
              orderNumber: orderData.orderNumber || orderId,
              productName: orderData.items?.[0]?.productName || '상품'
            }
          }),
        })

        const alimtalkResult = await alimtalkResponse.json()
        console.log('[자동 구매확정 API] 알림톡 발송 결과:', alimtalkResult)
      } catch (error) {
        console.error('[자동 구매확정 API] 알림톡 발송 실패:', error)
      }
    }

    // 푸시 알림 발송 (Firebase Admin SDK 직접 사용)
    const fcmResult = await sendFcmNotification(
      adminDb,
      orderData.uid,
      '구매가 자동 확정되었습니다',
      `${orderData.storeName}에서 주문하신 상품이 자동으로 구매확정 되었습니다.`,
      {
        type: 'ORDER_AUTO_CONFIRMED',
        orderId,
        orderNumber: orderData.orderNumber || orderId
      }
    )
    console.log('[자동 구매확정 API] 푸시 알림 발송 결과:', fcmResult)

    return NextResponse.json({
      success: true,
      message: '자동 구매확정이 완료되었습니다.'
    })

  } catch (error) {
    console.error('[자동 구매확정 API] 에러:', error)
    return NextResponse.json(
      { success: false, error: '자동 구매확정 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
