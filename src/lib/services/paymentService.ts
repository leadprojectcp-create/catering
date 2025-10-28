import * as PortOne from '@portone/browser-sdk/v2'

// 결제 요청 파라미터 타입
export interface PaymentRequest {
  orderName: string
  amount: number
  orderId: string
  customerName: string
  customerEmail: string
  customerPhoneNumber: string
}

// 결제 결과 타입
export interface PaymentResponse {
  success: boolean
  paymentId?: string
  errorCode?: string
  errorMessage?: string
}

// 포트원 결제창 호출 (간소화된 방식)
export const requestPayment = async (
  request: PaymentRequest
): Promise<PaymentResponse> => {
  try {
    console.log('=== 결제 요청 ===')
    console.log('Order:', request.orderName, request.amount)

    // 포트원 결제창 호출
    const paymentId = `payment-${request.orderId}-${Date.now()}`

    const response = await PortOne.requestPayment({
      storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
      channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
      paymentId,
      orderName: request.orderName,
      totalAmount: request.amount,
      currency: 'KRW',
      payMethod: 'CARD', // 기본 결제 수단 (결제창에서 변경 가능)
      customer: {
        fullName: request.customerName,
        phoneNumber: request.customerPhoneNumber,
        email: request.customerEmail,
      },
      redirectUrl: `${window.location.origin}/payments/complete?orderId=${request.orderId}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    console.log('=== 결제창 응답 ===')
    console.log('Response:', response)

    // 결제 실패
    if (response?.code != null) {
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
    }
  } catch (error) {
    console.error('결제 요청 실패:', error)
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }
  }
}

// 결제 검증
export const verifyPayment = async (paymentId: string): Promise<boolean> => {
  try {
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
