/**
 * FCM 푸시 알림 발송 서비스
 */

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

export interface SendOrderFCMParams {
  userId: string
  title: string
  body: string
  data: {
    type: string
    orderNumber: string
    isAdditionalOrder: string
  }
}

export interface SendCancellationFCMParams {
  userId: string
  title: string
  body: string
  data: {
    type: string
    orderNumber: string
  }
}

/**
 * 주문 FCM 푸시 알림 발송
 */
export async function sendOrderFCM(params: SendOrderFCMParams): Promise<boolean> {
  const { userId, title, body, data } = params

  try {
    // Firebase Admin 초기화
    initializeFirebaseAdmin()
    const adminDb = getAdminDb()

    // Firestore에서 사용자의 FCM 토큰 및 타입 가져오기
    let fcmToken = null
    let userType = 'user'

    try {
      const userDoc = await adminDb.collection('users').doc(userId).get()

      if (userDoc.exists) {
        const userData = userDoc.data()
        fcmToken = userData?.fcmToken
        userType = userData?.type || 'user'
      }
    } catch (firestoreError) {
      console.log('[주문 FCM] Firestore 조회 실패:', firestoreError)
    }

    if (!fcmToken) {
      console.log('[주문 FCM] No FCM token for user:', userId)
      return false
    }

    // 사용자 타입에 따라 경로 설정
    const isPartner = userType === 'partner'
    const isAdditionalOrder = data?.isAdditionalOrder === 'true'
    const orderNumber = data?.orderNumber

    // 파트너: 항상 /partner/order/history
    // 고객: 추가주문이면 상세 페이지, 신규주문이면 목록 페이지
    let redirectPath: string
    if (isPartner) {
      redirectPath = '/partner/order/history'
    } else {
      if (isAdditionalOrder && orderNumber) {
        redirectPath = `/orders?orderNumber=${orderNumber}`
      } else {
        redirectPath = '/orders'
      }
    }

    // FCM 메시지 전송
    const messaging = getAdminMessaging()

    const fcmMessage = {
      token: fcmToken,
      data: {
        title: title,
        body: body,
        path: redirectPath,
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

    console.log('[주문 FCM] FCM 전송:', { userId, title })
    const response = await messaging.send(fcmMessage)
    console.log('[주문 FCM] FCM 전송 성공, Message ID:', response)

    return true
  } catch (error) {
    console.error('[주문 FCM] Error:', error)

    const errorMessage = (error as Error)?.message || ''

    // FCM 토큰이 유효하지 않은 경우 토큰 삭제
    if (
      errorMessage.includes('Requested entity was not found') ||
      errorMessage.includes('not a valid FCM registration token') ||
      errorMessage.includes('registration-token-not-registered')
    ) {
      console.log('[주문 FCM] 유효하지 않은 FCM 토큰 - Firestore에서 토큰 삭제:', userId)

      try {
        initializeFirebaseAdmin()
        const adminDb = getAdminDb()
        await adminDb.collection('users').doc(userId).update({
          fcmToken: null
        })
        console.log('[주문 FCM] Firestore에서 토큰 삭제 완료')
      } catch (fsError) {
        console.error('[주문 FCM] Firestore 토큰 삭제 실패:', fsError)
      }
    }

    return false
  }
}

/**
 * 주문 취소 FCM 푸시 알림 발송
 */
export async function sendCancellationFCM(params: SendCancellationFCMParams): Promise<boolean> {
  const { userId, title, body, data } = params

  try {
    // Firebase Admin 초기화
    initializeFirebaseAdmin()
    const adminDb = getAdminDb()

    // Firestore에서 사용자의 FCM 토큰 및 타입 가져오기
    let fcmToken = null
    let userType = 'user'

    try {
      const userDoc = await adminDb.collection('users').doc(userId).get()

      if (userDoc.exists) {
        const userData = userDoc.data()
        fcmToken = userData?.fcmToken
        userType = userData?.type || 'user'
      }
    } catch (firestoreError) {
      console.log('[취소 FCM] Firestore 조회 실패:', firestoreError)
    }

    if (!fcmToken) {
      console.log('[취소 FCM] No FCM token for user:', userId)
      return false
    }

    // 사용자 타입에 따라 경로 설정
    const isPartner = userType === 'partner'
    const orderNumber = data?.orderNumber

    // 파트너: /partner/order/history
    // 고객: 주문 상세 페이지
    let redirectPath: string
    if (isPartner) {
      redirectPath = '/partner/order/history'
    } else {
      redirectPath = orderNumber ? `/orders?orderNumber=${orderNumber}` : '/orders'
    }

    // FCM 메시지 전송
    const messaging = getAdminMessaging()

    const fcmMessage = {
      token: fcmToken,
      data: {
        title: title,
        body: body,
        path: redirectPath,
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

    console.log('[취소 FCM] FCM 전송:', { userId, title })
    const response = await messaging.send(fcmMessage)
    console.log('[취소 FCM] FCM 전송 성공, Message ID:', response)

    return true
  } catch (error) {
    console.error('[취소 FCM] Error:', error)

    const errorMessage = (error as Error)?.message || ''

    // FCM 토큰이 유효하지 않은 경우 토큰 삭제
    if (
      errorMessage.includes('Requested entity was not found') ||
      errorMessage.includes('not a valid FCM registration token') ||
      errorMessage.includes('registration-token-not-registered')
    ) {
      console.log('[취소 FCM] 유효하지 않은 FCM 토큰 - Firestore에서 토큰 삭제:', userId)

      try {
        initializeFirebaseAdmin()
        const adminDb = getAdminDb()
        await adminDb.collection('users').doc(userId).update({
          fcmToken: null
        })
        console.log('[취소 FCM] Firestore에서 토큰 삭제 완료')
      } catch (fsError) {
        console.error('[취소 FCM] Firestore 토큰 삭제 실패:', fsError)
      }
    }

    return false
  }
}
