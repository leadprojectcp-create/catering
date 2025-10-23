import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const {
      paymentId,
      orderId,
      businessNumber,
      companyName,
      ceoName,
      businessAddress,
      businessType,
      businessCategory,
      email,
      totalAmount,
    } = await request.json()

    // 필수 필드 확인
    if (!paymentId || !orderId) {
      return NextResponse.json(
        { error: 'Payment ID and Order ID are required' },
        { status: 400 }
      )
    }

    if (!businessNumber || !companyName || !ceoName || !email) {
      return NextResponse.json(
        { error: 'Business information is required' },
        { status: 400 }
      )
    }

    if (!totalAmount) {
      return NextResponse.json(
        { error: 'Total amount is required' },
        { status: 400 }
      )
    }

    // 포트원 B2B 세금계산서 즉시 정발행 API
    const response = await fetch(
      'https://api.portone.io/b2b/tax-invoices/issue-immediately',
      {
        method: 'POST',
        headers: {
          'Authorization': `PortOne ${process.env.PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taxInvoice: {
            taxInvoiceKey: `tax-${orderId}-${Date.now()}`, // 세금계산서 고유 키
            writeDate: new Date().toISOString().split('T')[0], // 작성일자 (YYYY-MM-DD)
            purposeType: 'INVOICE', // 영수/청구 구분 (INVOICE: 청구, RECEIPT: 영수)
            taxationType: 'TAXABLE', // 과세 유형 (TAXABLE: 과세, TAX_FREE: 면세)

            // 공급자 정보 (우리 업체)
            supplier: {
              brn: process.env.NEXT_PUBLIC_BUSINESS_NUMBER || '', // 우리 사업자등록번호
              name: process.env.NEXT_PUBLIC_COMPANY_NAME || '케이터링',
              representativeName: process.env.NEXT_PUBLIC_CEO_NAME || '',
              address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || '',
              businessType: process.env.NEXT_PUBLIC_BUSINESS_TYPE || '서비스업',
              businessClass: process.env.NEXT_PUBLIC_BUSINESS_CATEGORY || '케이터링',
              contact: {
                email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
              },
            },

            // 공급받는자 정보 (고객)
            recipient: {
              brn: businessNumber.replace(/[^0-9]/g, ''), // 숫자만 추출
              name: companyName,
              representativeName: ceoName,
              address: businessAddress || '',
              businessType: businessType || '서비스업',
              businessClass: businessCategory || '일반',
              contact: {
                email: email,
              },
            },

            // 품목 정보
            productList: [
              {
                purchaseDate: new Date().toISOString().split('T')[0],
                name: '케이터링 서비스',
                spec: '',
                quantity: 1,
                unitPrice: Math.floor(totalAmount / 1.1), // 공급가액 (부가세 제외)
                supplyCost: Math.floor(totalAmount / 1.1),
                tax: Math.floor(totalAmount - totalAmount / 1.1), // 부가세
              },
            ],

            // 합계 금액
            totalSupplyAmount: Math.floor(totalAmount / 1.1), // 공급가액
            totalTaxAmount: Math.floor(totalAmount - totalAmount / 1.1), // 부가세
            totalAmount: totalAmount, // 총액

            // 비고
            remark: `주문번호: ${orderId}`,

            // 즉시 국세청 전송
            sendToNts: true,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PortOne Tax Invoice API error:', errorText)

      let errorMessage = '세금계산서 발급에 실패했습니다.'
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
      taxInvoice: data,
    })
  } catch (error) {
    console.error('Tax invoice issue error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
