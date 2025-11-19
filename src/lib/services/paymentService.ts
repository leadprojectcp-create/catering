import * as PortOne from '@portone/browser-sdk/v2'

// 결제 요청 파라미터 타입
export interface PaymentRequest {
  orderName: string
  amount: number
  orderId: string
  customerName: string
  customerEmail: string
  customerPhoneNumber: string
  customerUid?: string
  payMethod: 'CARD' | 'VIRTUAL_ACCOUNT' | 'TRANSFER' | 'EASY_PAY'
  easyPayProvider?: 'KAKAOPAY' | 'NAVERPAY' | 'TOSSPAY'
  channelKey?: string
}

// 결제 결과 타입
export interface PaymentResponse {
  success: boolean
  paymentId?: string
  transactionId?: string
  errorCode?: string
  errorMessage?: string
}

// 포트원 V2 결제창 호출
export const requestPayment = async (
  request: PaymentRequest
): Promise<PaymentResponse> => {
  try {
    console.log('=== 결제 요청 (V2) ===')
    console.log('Order:', request.orderName, request.amount)

    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID!

    if (!storeId) {
      throw new Error('스토어 ID가 설정되지 않았습니다.')
    }

    // 결제 ID 생성
    const paymentId = `payment-${request.orderId}-${Date.now()}`

    // 결제 방법 설정
    const payMethod = request.payMethod as PortOne.PaymentPayMethod

    // 포트원 V2 결제 요청 파라미터
    const paymentParams: PortOne.PaymentRequest = {
      storeId: storeId,
      paymentId: paymentId,
      orderName: request.orderName,
      totalAmount: request.amount,
      currency: 'KRW',
      payMethod: payMethod,
      customer: {
        customerId: request.customerUid,
        fullName: request.customerName,
        phoneNumber: request.customerPhoneNumber,
        email: request.customerEmail,
      },
      redirectUrl: `${window.location.origin}/payments/complete`,
      noticeUrls: [`${window.location.origin}/api/payments/webhook`]
    }

    // channelKey가 있으면 추가
    if (request.channelKey) {
      paymentParams.channelKey = request.channelKey
    }

    // 가상계좌 결제인 경우 추가 파라미터 설정
    if (payMethod === 'VIRTUAL_ACCOUNT') {
      paymentParams.virtualAccount = {
        accountExpiry: {
          validHours: 24 // 24시간 유효
        }
      }
    }

    // 포트원 V2 결제 요청
    const response = await PortOne.requestPayment(paymentParams)

    console.log('=== 결제창 응답 (V2) ===')
    console.log('Response:', response)

    // response가 없으면 사용자가 결제창을 닫은 경우
    if (!response) {
      return {
        success: false,
        errorMessage: '결제창이 닫혔습니다.',
      }
    }

    // V2는 code로 성공 여부 판단
    if (response.code != null) {
      // 결제 실패 또는 취소
      return {
        success: false,
        errorCode: response.code,
        errorMessage: response.message || '결제에 실패했습니다.',
      }
    }

    // 결제 성공
    if (response.paymentId) {
      return {
        success: true,
        paymentId: response.paymentId,
        transactionId: response.txId,
      }
    }

    // 예상치 못한 응답
    return {
      success: false,
      errorMessage: '결제 응답이 올바르지 않습니다.',
    }
  } catch (error) {
    console.error('결제 요청 실패:', error)
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }
  }
}

// 결제 검증 (서버 API 호출)
export const verifyPayment = async (paymentId: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_id: paymentId }),
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
