import { NextRequest, NextResponse } from 'next/server'

// PortOne V1 REST API로 결제 취소
export async function POST(request: NextRequest) {
  try {
    const { imp_uid, merchant_uid, reason, amount, checksum } = await request.json()

    if (!imp_uid && !merchant_uid) {
      return NextResponse.json(
        { error: 'imp_uid or merchant_uid is required' },
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
        { success: false, error: 'Failed to get access token' },
        { status: 500 }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.response.access_token

    // 결제 취소 요청
    const cancelResponse = await fetch('https://api.iamport.kr/payments/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        imp_uid: imp_uid || undefined,
        merchant_uid: merchant_uid || undefined,
        reason: reason || '고객 요청에 의한 취소',
        amount: amount || undefined, // 부분 취소 금액
        checksum: checksum || undefined, // 현재 남은 금액
      }),
    })

    if (!cancelResponse.ok) {
      const errorData = await cancelResponse.text()
      console.error('PortOne cancel API error:', errorData)
      return NextResponse.json(
        { success: false, error: 'Failed to cancel payment' },
        { status: 500 }
      )
    }

    const cancelData = await cancelResponse.json()

    console.log('[Cancel API] PortOne V1 결제 취소 완료:', {
      imp_uid: cancelData.response.imp_uid,
      merchant_uid: cancelData.response.merchant_uid,
      status: cancelData.response.status,
    })

    return NextResponse.json({
      success: true,
      cancellation: cancelData.response,
    })
  } catch (error) {
    console.error('Payment cancellation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
