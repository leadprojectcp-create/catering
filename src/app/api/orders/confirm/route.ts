import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

/**
 * 소비자 수동 구매확정 API
 * - shipping 상태인 주문만 구매확정 가능
 * - 구매확정 시 orderStatus를 completed로 변경
 * - Cloud Tasks 알림/자동완료 작업 취소 (TODO: Cloud Tasks 연동 후 구현)
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, uid } = await request.json()

    console.log('[구매확정 API] 요청:', { orderId, uid })

    if (!orderId || !uid) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 주문 조회
    const orderRef = doc(db, 'orders', orderId)
    const orderSnap = await getDoc(orderRef)

    if (!orderSnap.exists()) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const orderData = orderSnap.data()

    // 주문자 확인
    if (orderData.uid !== uid) {
      return NextResponse.json(
        { success: false, error: '본인의 주문만 구매확정할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 상태 확인 - shipping 상태만 구매확정 가능
    if (orderData.orderStatus !== 'shipping') {
      return NextResponse.json(
        { success: false, error: '배송·픽업중 상태에서만 구매확정이 가능합니다.' },
        { status: 400 }
      )
    }

    // 이미 구매확정된 경우
    if (orderData.confirmedAt) {
      return NextResponse.json(
        { success: false, error: '이미 구매확정된 주문입니다.' },
        { status: 400 }
      )
    }

    // Cloud Tasks 알림 작업 취소 (알림 발송 전 구매확정한 경우)
    // TODO: Cloud Tasks 연동 후 구현
    // if (orderData.notificationTaskId) {
    //   await cancelCloudTask(orderData.notificationTaskId)
    // }

    // Cloud Tasks 자동완료 작업 취소
    // TODO: Cloud Tasks 연동 후 구현
    // if (orderData.autoCompleteTaskId) {
    //   await cancelCloudTask(orderData.autoCompleteTaskId)
    // }

    // 구매확정 처리
    await updateDoc(orderRef, {
      orderStatus: 'completed',
      confirmedAt: serverTimestamp(),
      confirmationType: 'manual',  // 소비자 수동 확정
      settlementStatus: 'pending',  // 정산 대기 상태로 변경
      updatedAt: serverTimestamp()
    })

    console.log('[구매확정 API] 구매확정 완료:', orderId)

    return NextResponse.json({
      success: true,
      message: '구매가 확정되었습니다.'
    })

  } catch (error) {
    console.error('[구매확정 API] 에러:', error)
    return NextResponse.json(
      { success: false, error: '구매확정 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
