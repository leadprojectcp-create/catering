import { NextRequest, NextResponse } from 'next/server'
import * as PortOne from '@portone/server-sdk'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'

// PortOne V2 SDK로 결제 취소
export async function POST(request: NextRequest) {
  try {
    const { paymentId, reason, refundAmount, isPartnerCancel } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: 'paymentId is required' },
        { status: 400 }
      )
    }

    const apiSecret = process.env.PORTONE_API_KEY
    if (!apiSecret) {
      console.error('PORTONE_API_KEY is not set')
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      )
    }

    // PortOne V2 클라이언트 생성
    const client = PortOne.PortOneClient({
      secret: apiSecret,
    })

    // 결제 취소 요청
    const cancelResponse = await client.payment.cancelPayment({
      paymentId: paymentId,
      reason: reason || '고객 요청에 의한 취소',
      amount: refundAmount, // 부분 취소 금액 (전체 취소는 undefined)
    })

    console.log('[Cancel API] PortOne V2 결제 취소 완료:', {
      paymentId: paymentId,
      cancelledAmount: refundAmount,
      status: 'cancelled'
    })

    // 결제 취소 성공 후 바로 DB 업데이트
    try {
      // paymentId로 주문 검색
      const ordersRef = collection(db, 'orders')
      const q = query(ordersRef, where('paymentId', 'array-contains', paymentId))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const orderDoc = querySnapshot.docs[0]
        const orderId = orderDoc.id
        const orderData = orderDoc.data()
        const existingPaymentInfo = orderData.paymentInfo || []
        const currentOrderStatus = orderData.orderStatus

        console.log('[Cancel API] 주문 찾음:', orderId, '현재 상태:', currentOrderStatus)

        // paymentInfo에서 해당 paymentId 찾아서 status를 'cancelled'로 변경
        const updatedPaymentInfo = existingPaymentInfo.map((info: { id: string; status: string; cancelledAt?: Date }) => {
          if (info.id === paymentId) {
            console.log('[Cancel API] paymentInfo 업데이트:', info.id)
            return {
              ...info,
              status: 'cancelled',
              cancelledAt: new Date()
            }
          }
          return info
        })

        // orderStatus 결정
        let newOrderStatus: string
        if (isPartnerCancel) {
          // 판매자 취소는 항상 'rejected'
          newOrderStatus = 'rejected'
        } else {
          // 고객 취소는 pending 상태면 cancelled_before_accept, 그 외는 cancelled
          newOrderStatus = currentOrderStatus === 'pending' ? 'cancelled_before_accept' : 'cancelled'
        }

        console.log('[Cancel API] orderStatus 업데이트:', currentOrderStatus, '->', newOrderStatus, isPartnerCancel ? '(판매자 취소)' : '(고객 취소)')

        // DB 업데이트
        const orderRef = doc(db, 'orders', orderId)
        await updateDoc(orderRef, {
          paymentStatus: 'refunded',
          orderStatus: newOrderStatus,
          paymentInfo: updatedPaymentInfo,
          updatedAt: new Date()
        })

        console.log('[Cancel API] DB 업데이트 완료:', orderId)
      } else {
        console.warn('[Cancel API] 주문을 찾을 수 없음:', paymentId)
      }
    } catch (dbError) {
      console.error('[Cancel API] DB 업데이트 실패:', dbError)
      // DB 업데이트 실패해도 웹훅이 처리하므로 에러는 로그만
    }

    return NextResponse.json({
      success: true,
      cancellation: cancelResponse,
    })
  } catch (error) {
    console.error('Payment cancellation error:', error)

    // PortOne SDK 에러 처리
    if (error instanceof PortOne.PortOneError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'PortOne API error',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
