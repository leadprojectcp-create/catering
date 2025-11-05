import { NextRequest, NextResponse } from 'next/server'

// PortOne V1 REST API로 결제 검증
export async function POST(request: NextRequest) {
  try {
    const { imp_uid } = await request.json()

    if (!imp_uid) {
      return NextResponse.json(
        { error: 'imp_uid is required' },
        { status: 400 }
      )
    }

    // PortOne V1 액세스 토큰 발급
    const tokenResponse = await fetch('https://api.iamport.kr/users/getToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imp_key: process.env.PORTONE_API_KEY,
        imp_secret: process.env.PORTONE_API_SECRET,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('PortOne token error:', await tokenResponse.text())
      return NextResponse.json(
        { verified: false, error: 'Failed to get access token' },
        { status: 500 }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.response.access_token

    // 결제 정보 조회
    const paymentResponse = await fetch(
      `https://api.iamport.kr/payments/${encodeURIComponent(imp_uid)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!paymentResponse.ok) {
      console.error('PortOne API error:', await paymentResponse.text())
      return NextResponse.json(
        { verified: false, error: 'Failed to verify payment' },
        { status: 500 }
      )
    }

    const paymentData = await paymentResponse.json()

    console.log('[Verify API] PortOne V1 결제 검증:', {
      imp_uid: paymentData.response.imp_uid,
      status: paymentData.response.status,
      amount: paymentData.response.amount
    })

    // 결제 상태 확인 (paid = 결제 완료)
    const isVerified = paymentData.response.status === 'paid'

    return NextResponse.json({
      verified: isVerified,
      payment: paymentData.response,
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { verified: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
