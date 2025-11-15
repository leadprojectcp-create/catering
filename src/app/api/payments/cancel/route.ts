import { NextRequest, NextResponse } from 'next/server'
import * as PortOne from '@portone/server-sdk'

// PortOne V2 SDK로 결제 취소
export async function POST(request: NextRequest) {
  try {
    const { paymentId, reason, refundAmount } = await request.json()

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
