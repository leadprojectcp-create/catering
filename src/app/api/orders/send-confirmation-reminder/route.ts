import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

/**
 * 구매확정 안내 알림 발송 API
 * - Cloud Tasks에서 배송완료 후 1시간(퀵/픽업) 또는 24시간(택배) 후 호출
 * - 이미 구매확정된 경우 알림 발송 스킵
 * - 알림톡 + 푸시 알림 발송
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    console.log('[구매확정 알림 API] 요청:', { orderId })

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
      console.log('[구매확정 알림 API] 주문을 찾을 수 없음:', orderId)
      return NextResponse.json({
        success: true,
        message: '주문을 찾을 수 없습니다.',
        skipped: true
      })
    }

    const orderData = orderSnap.data()

    // 이미 구매확정된 경우 알림 발송 스킵
    if (orderData.orderStatus === 'completed' || orderData.confirmedAt) {
      console.log('[구매확정 알림 API] 이미 구매확정됨, 알림 스킵:', orderId)
      return NextResponse.json({
        success: true,
        message: '이미 구매확정되어 알림 발송을 스킵합니다.',
        skipped: true
      })
    }

    // shipping 상태가 아니면 스킵
    if (orderData.orderStatus !== 'shipping') {
      console.log('[구매확정 알림 API] shipping 상태 아님, 알림 스킵:', orderId, orderData.orderStatus)
      return NextResponse.json({
        success: true,
        message: '배송중 상태가 아니어서 알림 발송을 스킵합니다.',
        skipped: true
      })
    }

    // 소비자 정보 조회
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
            templateCode: 'ORDER_CONFIRM_REMINDER',  // TODO: 실제 템플릿 코드로 변경
            variables: {
              storeName: orderData.storeName,
              orderNumber: orderData.orderNumber || orderId,
              productName: orderData.items?.[0]?.productName || '상품'
            }
          }),
        })

        const alimtalkResult = await alimtalkResponse.json()
        console.log('[구매확정 알림 API] 알림톡 발송 결과:', alimtalkResult)
      } catch (error) {
        console.error('[구매확정 알림 API] 알림톡 발송 실패:', error)
      }
    }

    // 푸시 알림 발송 (send-order-fcm API 사용)
    try {
      const fcmResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-order-fcm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: orderData.uid,
          title: '구매확정을 해주세요!',
          body: `${orderData.storeName}에서 주문하신 상품이 배송완료 되었습니다. 구매확정을 눌러주세요.`,
          data: {
            type: 'ORDER_CONFIRM_REMINDER',
            orderId,
            orderNumber: orderData.orderNumber || orderId
          }
        }),
      })

      const fcmResult = await fcmResponse.json()
      console.log('[구매확정 알림 API] 푸시 알림 발송 결과:', fcmResult)
    } catch (error) {
      console.error('[구매확정 알림 API] 푸시 알림 발송 실패:', error)
    }

    // 알림 발송 완료 표시
    await updateDoc(orderRef, {
      notificationSent: true,
      notificationSentAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    console.log('[구매확정 알림 API] 알림 발송 완료:', orderId)

    return NextResponse.json({
      success: true,
      message: '구매확정 안내 알림을 발송했습니다.'
    })

  } catch (error) {
    console.error('[구매확정 알림 API] 에러:', error)
    return NextResponse.json(
      { success: false, error: '알림 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
