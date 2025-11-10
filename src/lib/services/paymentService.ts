// PortOne V1 타입 정의
declare global {
  interface Window {
    IMP?: {
      init: (impCode: string) => void
      request_pay: (params: PaymentParams, callback: (response: PaymentCallbackResponse) => void) => void
    }
  }
}

interface PaymentParams {
  pg?: string
  channelKey?: string
  pay_method: string
  merchant_uid: string
  name: string
  amount: number
  buyer_email: string
  buyer_name: string
  buyer_tel: string
  m_redirect_url?: string
}

interface PaymentCallbackResponse {
  success: boolean
  imp_uid?: string
  merchant_uid?: string
  error_code?: string
  error_msg?: string
}

// 결제 요청 파라미터 타입
export interface PaymentRequest {
  orderName: string
  amount: number
  orderId: string
  customerName: string
  customerEmail: string
  customerPhoneNumber: string
  customerUid?: string
  payMethod: 'card' | 'kakaopay' | 'naverpay'
  channelKey?: string
}

// 결제 결과 타입
export interface PaymentResponse {
  success: boolean
  paymentId?: string
  merchantUid?: string
  errorCode?: string
  errorMessage?: string
}

// PortOne V1 SDK 로드
export const loadPortOneScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.IMP) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.iamport.kr/v1/iamport.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('PortOne SDK 로드 실패'))
    document.head.appendChild(script)
  })
}

// 포트원 V1 결제창 호출
export const requestPayment = async (
  request: PaymentRequest
): Promise<PaymentResponse> => {
  try {
    console.log('=== 결제 요청 (V1) ===')
    console.log('Order:', request.orderName, request.amount)

    // SDK 로드
    await loadPortOneScript()

    if (!window.IMP) {
      throw new Error('PortOne SDK가 로드되지 않았습니다.')
    }

    // IMP 초기화
    const impCode = process.env.NEXT_PUBLIC_PORTONE_IMP_CODE!
    window.IMP.init(impCode)

    // 결제 ID 생성
    const merchantUid = `order-${request.orderId}-${Date.now()}`

    // 전달받은 채널키 사용, 없으면 기본 일반결제 채널키 사용
    const channelKey = request.channelKey || process.env.NEXT_PUBLIC_PORTONE_GENERAL_CHANNEL_KEY!

    // 결제 수단
    const payMethod = request.payMethod

    // 결제 요청
    return new Promise((resolve) => {
      window.IMP!.request_pay(
        {
          channelKey: channelKey,
          pay_method: payMethod,
          merchant_uid: merchantUid,
          name: request.orderName,
          amount: request.amount,
          buyer_email: request.customerEmail,
          buyer_name: request.customerName,
          buyer_tel: request.customerPhoneNumber,
        },
        (response) => {
          console.log('=== 결제창 응답 (V1) ===')
          console.log('Response:', response)

          // imp_uid가 있으면 결제 성공
          if (response.imp_uid) {
            // 결제 성공
            resolve({
              success: true,
              paymentId: response.imp_uid,
              merchantUid: response.merchant_uid,
            })
          } else {
            // 결제 실패
            resolve({
              success: false,
              errorCode: response.error_code,
              errorMessage: response.error_msg || '결제에 실패했습니다.',
            })
          }
        }
      )
    })
  } catch (error) {
    console.error('결제 요청 실패:', error)
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }
  }
}

// 결제 검증
export const verifyPayment = async (impUid: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imp_uid: impUid }),
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
