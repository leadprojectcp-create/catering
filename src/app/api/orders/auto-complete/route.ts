import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

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

    // 소비자에게 자동 구매확정 알림 발송
    const userRef = doc(db, 'users', orderData.uid)
    const userSnap = await getDoc(userRef)
    const userData = userSnap.exists() ? userSnap.data() : null

    const phone = orderData.phone || userData?.phone
    const fcmToken = userData?.fcmToken

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

    // 푸시 알림 발송
    if (fcmToken) {
      try {
        const fcmResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-fcm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: fcmToken,
            title: '구매가 자동 확정되었습니다',
            body: `${orderData.storeName}에서 주문하신 상품이 자동으로 구매확정 되었습니다.`,
            data: {
              type: 'ORDER_AUTO_CONFIRMED',
              orderId
            }
          }),
        })

        const fcmResult = await fcmResponse.json()
        console.log('[자동 구매확정 API] 푸시 알림 발송 결과:', fcmResult)
      } catch (error) {
        console.error('[자동 구매확정 API] 푸시 알림 발송 실패:', error)
      }
    }

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
