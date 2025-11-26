import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { scheduleOrderCompletionTasks } from '@/lib/services/cloudTasksService'

export const dynamic = 'force-dynamic'

/**
 * 주문 상태 업데이트 API
 * - shipping 상태로 변경 시 Cloud Tasks 생성 (알림 + 자동완료)
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, status, trackingInfo } = await request.json()

    console.log('[주문 상태 업데이트 API] 요청:', { orderId, status, trackingInfo })

    if (!orderId || !status) {
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

    // 업데이트 데이터 준비
    const updateData: Record<string, any> = {
      orderStatus: status,
      updatedAt: serverTimestamp()
    }

    // 택배 정보가 있으면 추가
    if (trackingInfo) {
      updateData.trackingInfo = trackingInfo
    }

    // shipping 상태로 변경되는 경우
    if (status === 'shipping') {
      updateData.shippingCompletedAt = serverTimestamp()

      // Cloud Tasks 생성 (알림 발송 + 자동완료)
      try {
        const deliveryDate = orderData.deliveryInfo?.deliveryDate || orderData.deliveryDate
        const deliveryTime = orderData.deliveryInfo?.deliveryTime || orderData.deliveryTime
        const deliveryMethod = orderData.deliveryMethod

        if (deliveryDate) {
          const { notificationTaskId, autoCompleteTaskId } = await scheduleOrderCompletionTasks(
            orderId,
            deliveryMethod,
            deliveryDate,
            deliveryTime
          )

          // Task ID 저장
          if (notificationTaskId) {
            updateData.notificationTaskId = notificationTaskId
          }
          if (autoCompleteTaskId) {
            updateData.autoCompleteTaskId = autoCompleteTaskId
          }

          console.log('[주문 상태 업데이트 API] Cloud Tasks 생성 완료:', {
            orderId,
            notificationTaskId,
            autoCompleteTaskId
          })
        } else {
          console.warn('[주문 상태 업데이트 API] 배송일 정보 없음, Cloud Tasks 생성 스킵')
        }
      } catch (taskError) {
        console.error('[주문 상태 업데이트 API] Cloud Tasks 생성 실패:', taskError)
        // Cloud Tasks 생성 실패해도 주문 상태는 업데이트
      }
    }

    // completed 상태로 변경되는 경우 (이제는 사용되지 않지만 호환성을 위해 유지)
    if (status === 'completed') {
      updateData.settlementStatus = 'pending'
    }

    // 주문 상태 업데이트
    await updateDoc(orderRef, updateData)

    console.log('[주문 상태 업데이트 API] 상태 업데이트 완료:', orderId, status)

    return NextResponse.json({
      success: true,
      message: '주문 상태가 업데이트되었습니다.'
    })

  } catch (error) {
    console.error('[주문 상태 업데이트 API] 에러:', error)
    return NextResponse.json(
      { success: false, error: '주문 상태 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
