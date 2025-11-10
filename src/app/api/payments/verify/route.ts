import { NextRequest, NextResponse } from 'next/server'
import * as PortOne from '@portone/server-sdk'

// PortOne V2 SDK로 결제 검증
export async function POST(request: NextRequest) {
  try {
    const { payment_id } = await request.json()

    if (!payment_id) {
      return NextResponse.json(
        { error: 'payment_id is required' },
        { status: 400 }
      )
    }

    const apiSecret = process.env.PORTONE_API_KEY
    if (!apiSecret) {
      console.error('PORTONE_API_KEY is not set')
      return NextResponse.json(
        { verified: false, error: 'API key not configured' },
        { status: 500 }
      )
    }

    // PortOne V2 클라이언트 생성
    const client = PortOne.PortOneClient({
      secret: apiSecret,
    })

    // 결제 정보 조회
    const paymentResponse = await client.payment.getPayment({
      paymentId: payment_id,
    })

    // 결제 상태 확인 (PAID = 결제 완료)
    const isVerified = paymentResponse.status === 'PAID'

    console.log('[Verify API] PortOne V2 결제 검증:', {
      paymentId: isVerified && 'id' in paymentResponse ? paymentResponse.id : payment_id,
      status: paymentResponse.status,
      amount: isVerified && 'amount' in paymentResponse ? paymentResponse.amount?.total : undefined
    })

    return NextResponse.json({
      verified: isVerified,
      payment: paymentResponse,
    })
  } catch (error) {
    console.error('Payment verification error:', error)

    // PortOne SDK 에러 처리
    if (error instanceof PortOne.PortOneError) {
      return NextResponse.json(
        {
          verified: false,
          error: error.message || 'PortOne API error',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { verified: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
