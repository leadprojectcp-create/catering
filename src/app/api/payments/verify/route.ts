import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // 포트원 API로 결제 정보 조회
    const response = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
        },
      }
    )

    if (!response.ok) {
      console.error('PortOne API error:', await response.text())
      return NextResponse.json(
        { verified: false, error: 'Failed to verify payment' },
        { status: 500 }
      )
    }

    const paymentData = await response.json()

    console.log('[Verify API] PortOne 결제 검증:', {
      paymentId: paymentData.id,
      status: paymentData.status,
      amount: paymentData.amount?.total
    })

    // 결제 상태 확인
    const isVerified = paymentData.status === 'PAID'

    return NextResponse.json({
      verified: isVerified,
      payment: paymentData,
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { verified: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
