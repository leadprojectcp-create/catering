import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { paymentId, reason, refundAmount } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // 포트원 API로 결제 취소 요청
    const response = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
        },
        body: JSON.stringify({
          reason: reason || '고객 요청에 의한 취소',
          ...(refundAmount && { amount: refundAmount }),
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('PortOne cancel API error:', errorData)
      return NextResponse.json(
        { success: false, error: 'Failed to cancel payment' },
        { status: 500 }
      )
    }

    const cancelData = await response.json()

    return NextResponse.json({
      success: true,
      cancellation: cancelData,
    })
  } catch (error) {
    console.error('Payment cancellation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
