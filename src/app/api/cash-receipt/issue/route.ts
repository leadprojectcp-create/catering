import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { paymentId, type, identityNumber } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    if (!type || !identityNumber) {
      return NextResponse.json(
        { error: 'Type and identity number are required' },
        { status: 400 }
      )
    }

    // 먼저 결제 정보 조회
    const paymentInfoResponse = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
        },
      }
    )

    if (!paymentInfoResponse.ok) {
      console.error('Failed to fetch payment info')
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payment information' },
        { status: 500 }
      )
    }

    const paymentData = await paymentInfoResponse.json()
    const payMethod = paymentData.method?.type || paymentData.payMethod

    // 현금성 결제 수단 확인
    const cashMethods = ['VIRTUAL_ACCOUNT', 'TRANSFER']
    if (!cashMethods.includes(payMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: '현금영수증은 가상계좌 또는 계좌이체 결제만 가능합니다. 카드 결제 및 간편결제는 발급이 불가능합니다.'
        },
        { status: 400 }
      )
    }

    // 포트원 API로 현금영수증 발급
    const response = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cash-receipt`,
      {
        method: 'POST',
        headers: {
          'Authorization': `PortOne ${process.env.PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type, // 'PERSONAL' (소득공제용) 또는 'CORPORATE' (지출증빙용)
          customerIdentityNumber: identityNumber, // 휴대폰번호, 주민등록번호, 사업자등록번호
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PortOne Cash Receipt API error:', errorText)

      let errorMessage = '현금영수증 발급에 실패했습니다.'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch (e) {
        // JSON 파싱 실패시 기본 메시지 사용
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      cashReceipt: data,
    })
  } catch (error) {
    console.error('Cash receipt issue error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
