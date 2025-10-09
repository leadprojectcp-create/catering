import * as PortOne from '@portone/browser-sdk/v2'

// 결제 요청 파라미터 타입
export interface PaymentRequest {
  orderName: string // 주문명
  amount: number // 결제 금액
  orderId: string // 주문 ID (고유값)
  customerName?: string // 고객 이름
  customerEmail?: string // 고객 이메일
  customerPhoneNumber?: string // 고객 전화번호
}

// 결제 결과 타입
export interface PaymentResponse {
  success: boolean
  paymentId?: string
  transactionId?: string
  errorCode?: string
  errorMessage?: string
}

// 포트원 결제 요청
export const requestPayment = async (
  request: PaymentRequest
): Promise<PaymentResponse> => {
  try {
    console.log('=== 결제 요청 디버깅 ===')
    console.log('Request:', request)
    console.log('Customer Email:', request.customerEmail)
    console.log('Customer Name:', request.customerName)
    console.log('Customer Phone:', request.customerPhoneNumber)

    const response = await PortOne.requestPayment({
      storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
      channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
      paymentId: `payment-${request.orderId}-${Date.now()}`,
      orderName: request.orderName,
      totalAmount: request.amount,
      currency: 'KRW',
      payMethod: 'CARD',
      customer: {
        fullName: request.customerName,
        phoneNumber: request.customerPhoneNumber,
        email: request.customerEmail,
      },
    })

    console.log('=== 포트원 응답 ===')
    console.log('Response:', response)

    // 결제 성공
    if (response?.code != null) {
      // 결제 실패
      return {
        success: false,
        errorCode: response.code,
        errorMessage: response.message,
      }
    }

    // 결제 성공
    return {
      success: true,
      paymentId: response?.paymentId,
      transactionId: response?.txId,
    }
  } catch (error) {
    console.error('결제 요청 실패:', error)
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }
  }
}

// 결제 검증 (서버사이드에서 호출해야 함)
export const verifyPayment = async (paymentId: string): Promise<boolean> => {
  try {
    // TODO: 서버 API를 통해 포트원 결제 검증
    // 실제로는 백엔드에서 PortOne API를 호출하여 검증해야 함
    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentId }),
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.verified
  } catch (error) {
    console.error('결제 검증 실패:', error)
    return false
  }
}
