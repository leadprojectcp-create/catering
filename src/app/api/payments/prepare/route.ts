import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, amount, orderName, customerName, customerEmail, customerPhoneNumber } = body

    // 입력 검증
    if (!orderId || !amount || !orderName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 포트원 결제 준비 API 호출
    const paymentId = `payment-${orderId}-${Date.now()}`

    const response = await fetch('https://api.portone.io/payments/prepare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `PortOne ${process.env.PORTONE_API_SECRET}`,
      },
      body: JSON.stringify({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID,
        paymentId,
        orderName,
        totalAmount: amount,
        currency: 'KRW',
        customer: {
          customerId: orderId,
          fullName: customerName,
          email: customerEmail,
          phoneNumber: customerPhoneNumber,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('결제 준비 실패:', errorData)
      return NextResponse.json(
        { error: 'Failed to prepare payment', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      paymentId,
      data,
    })
  } catch (error) {
    console.error('결제 준비 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
