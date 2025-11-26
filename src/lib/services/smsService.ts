/**
 * 알리고(Aligo) 알림 발송 서비스
 * - 카카오톡 알림톡: 주문 알림
 * - SMS: 인증번호 발송
 * - 푸시 알림: FCM을 통한 모바일 알림
 */

import { sendOrderFCM, sendCancellationFCM } from './fcmService'

// 버튼 타입 정의
interface TemplateButton {
  ordering?: string
  name?: string
  linkType?: string
  linkMo?: string
  [key: string]: unknown
}

// 템플릿 캐시 (메모리에 저장)
const templateCache: Record<string, { message: string; buttons: TemplateButton[] }> = {}

// 템플릿 조회 함수
async function fetchTemplate(templateCode: string): Promise<{ message: string; buttons: TemplateButton[] } | null> {
  // 캐시에 있으면 반환
  if (templateCache[templateCode]) {
    return templateCache[templateCode]
  }

  try {
    const apiKey = process.env.ALIGO_API_KEY
    const userId = process.env.ALIGO_USER_ID
    const senderKey = process.env.ALIGO_SENDER_KEY

    if (!apiKey || !userId || !senderKey) {
      console.error('[템플릿 조회] Missing environment variables')
      return null
    }

    const params = new URLSearchParams({
      apikey: apiKey,
      userid: userId,
      senderkey: senderKey,
      tpl_code: templateCode
    })

    const response = await fetch('https://kakaoapi.aligo.in/akv10/template/list/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const result = await response.json()

    if (result.code === 0 && result.list && result.list.length > 0) {
      const template = result.list[0]
      const templateData = {
        message: template.templtContent,
        buttons: template.buttons || []
      }

      // 캐시에 저장
      templateCache[templateCode] = templateData

      console.log(`[템플릿 조회] ${templateCode} 조회 성공`)
      return templateData
    } else {
      console.error(`[템플릿 조회] ${templateCode} 조회 실패:`, result.message)
      return null
    }
  } catch (error) {
    console.error(`[템플릿 조회] ${templateCode} 에러:`, error)
    return null
  }
}

// 인증번호 생성 (6자리)
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 인증번호 메시지 템플릿
export function getVerificationMessage(code: string): string {
  return `[단모] 인증번호는 [${code}]입니다. 5분 내에 입력해주세요.`
}

// 카카오톡 알림톡 발송 (서버에서만 호출)
export async function sendKakaoAlimtalk(
  phone: string,
  templateCode: string,
  variables: Record<string, string>
): Promise<boolean> {
  try {
    const apiKey = process.env.ALIGO_API_KEY
    const userId = process.env.ALIGO_USER_ID
    const sender = process.env.ALIGO_SENDER
    const senderKey = process.env.ALIGO_SENDER_KEY
    const isDevelopment = process.env.NODE_ENV === 'development'
    const useTestMode = process.env.ALIGO_TEST_MODE === 'true'

    console.log('[Aligo 카카오톡] ENV Check:', {
      hasApiKey: !!apiKey,
      hasUserId: !!userId,
      hasSender: !!sender,
      hasSenderKey: !!senderKey,
      isDevelopment,
      useTestMode,
    })

    // 개발 환경이고 테스트 모드일 때는 콘솔에만 출력
    if (isDevelopment && useTestMode) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[TEST MODE] 카카오톡 알림톡 발송 시뮬레이션')
      console.log('수신번호:', phone)
      console.log('템플릿코드:', templateCode)
      console.log('변수:', variables)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return true
    }

    if (!apiKey || !userId || !sender || !senderKey) {
      console.error('[Aligo 카카오톡] Missing environment variables')
      return false
    }

    const receiver = phone.replace(/-/g, '') // 하이픈 제거

    console.log('[Aligo 카카오톡] Sending to:', receiver)

    // 템플릿 조회
    const template = await fetchTemplate(templateCode)
    if (!template) {
      console.error(`[Aligo 카카오톡] 템플릿 조회 실패: ${templateCode}`)
      return false
    }

    // 변수 치환
    let message = template.message
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replaceAll(`#{${key}}`, String(value))
    })

    const params = new URLSearchParams({
      apikey: apiKey,
      userid: userId,
      senderkey: senderKey,
      tpl_code: templateCode,
      sender: sender,
      receiver_1: receiver,
      subject_1: '주문알림',
      message_1: message,
      button_1: JSON.stringify({
        button: template.buttons
      }),
    })

    console.log('[Aligo 카카오톡] Request params:', {
      apikey: apiKey?.substring(0, 10) + '...',
      userid: userId,
      senderkey: senderKey?.substring(0, 10) + '...',
      tpl_code: templateCode,
      sender: sender,
      receiver_1: receiver,
      subject_1: '주문알림',
      templateVariables: variables,
    })

    const response = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const result = await response.json()

    console.log('[Aligo 카카오톡] Full Response:', JSON.stringify(result, null, 2))

    // 알리고 카카오톡 API 응답: code가 0이면 성공
    if (result.code === 0) {
      console.log('[Aligo 카카오톡] Success!')
      return true
    } else {
      console.error('[Aligo 카카오톡] Failed:', result.message || result)
      return false
    }
  } catch (error) {
    console.error('[Aligo 카카오톡] Error:', error)
    return false
  }
}

// 주문 알림 발송 (파트너 + 고객) - 카카오톡 알림톡 + 푸시알림
export interface OrderNotificationParams {
  partnerPhone?: string
  customerPhone?: string
  partnerId?: string
  customerId?: string
  isAdditionalOrder: boolean
  storeName: string
  orderNumber: string
  totalQuantity: number
  totalProductPrice: number
  additionalQuantity: number
  additionalProductPrice: number
}

// 템플릿 변수 치환 함수
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replaceAll(`{{${key}}}`, value)
  })
  return result
}

export async function sendOrderNotification(params: OrderNotificationParams): Promise<void> {
  const { partnerPhone, customerPhone, partnerId, customerId, isAdditionalOrder, ...variables } = params

  // 템플릿 불러오기
  const templates = require('@/config/notificationTemplates.json')

  const variablesStr = {
    storeName: variables.storeName,
    orderNumber: variables.orderNumber,
    totalQuantity: String(variables.totalQuantity),
    totalProductPrice: variables.totalProductPrice.toLocaleString(),
    additionalQuantity: String(variables.additionalQuantity),
    additionalProductPrice: variables.additionalProductPrice.toLocaleString(),
  }

  console.log('[주문 알림] 발송 시작', { isAdditionalOrder })

  // 파트너 알림 (카카오톡 알림톡 + 푸시)
  if (partnerPhone || partnerId) {
    const templateType = isAdditionalOrder ? 'additional' : 'new'
    const template = templates.order.partner[templateType]

    // 카카오톡 알림톡 발송
    if (partnerPhone) {
      try {
        const templateCode = template.templateCode

        const kakaoVariables = {
          storeName: variables.storeName,
          orderNumber: variables.orderNumber,
          totalQuantity: String(variables.totalQuantity),
          totalProductPrice: variables.totalProductPrice.toLocaleString(),
          additionalQuantity: String(variables.additionalQuantity),
          additionalProductPrice: variables.additionalProductPrice.toLocaleString(),
        }

        const kakaoResult = await sendKakaoAlimtalk(partnerPhone, templateCode, kakaoVariables)
        console.log('[주문 알림] 파트너 카카오톡 발송 결과:', kakaoResult)
      } catch (error) {
        console.error('[주문 알림] 파트너 카카오톡 발송 실패:', error)
      }
    }

    // 푸시 알림 발송 (앱이 있으면 자동으로 전송됨, 없으면 실패)
    if (partnerId) {
      try {
        const pushTitle = replaceTemplateVariables(template.push.title, variablesStr)
        const pushBody = replaceTemplateVariables(template.push.body, variablesStr)

        const result = await sendOrderFCM({
          userId: partnerId,
          title: pushTitle,
          body: pushBody,
          data: {
            type: 'order',
            orderNumber: variables.orderNumber,
            isAdditionalOrder: String(isAdditionalOrder)
          }
        })
        console.log('[주문 알림] 파트너 푸시 발송 결과:', result)
      } catch (error) {
        console.error('[주문 알림] 파트너 푸시 발송 실패:', error)
      }
    }
  }

  // 고객 알림 (카카오톡 알림톡 + 푸시)
  if (customerPhone || customerId) {
    const templateType = isAdditionalOrder ? 'additional' : 'new'
    const template = templates.order.customer[templateType]

    // 카카오톡 알림톡 발송
    if (customerPhone) {
      try {
        const templateCode = template.templateCode

        const kakaoVariables = {
          storeName: variables.storeName,
          orderNumber: variables.orderNumber,
          totalQuantity: String(variables.totalQuantity),
          totalProductPrice: variables.totalProductPrice.toLocaleString(),
          additionalQuantity: String(variables.additionalQuantity),
          additionalProductPrice: variables.additionalProductPrice.toLocaleString(),
        }

        const kakaoResult = await sendKakaoAlimtalk(customerPhone, templateCode, kakaoVariables)
        console.log('[주문 알림] 고객 카카오톡 발송 결과:', kakaoResult)
      } catch (error) {
        console.error('[주문 알림] 고객 카카오톡 발송 실패:', error)
      }
    }

    // 푸시 알림 발송 (앱이 있으면 자동으로 전송됨, 없으면 실패)
    if (customerId) {
      try {
        const pushTitle = replaceTemplateVariables(template.push.title, variablesStr)
        const pushBody = replaceTemplateVariables(template.push.body, variablesStr)

        const result = await sendOrderFCM({
          userId: customerId,
          title: pushTitle,
          body: pushBody,
          data: {
            type: 'order',
            orderNumber: variables.orderNumber,
            isAdditionalOrder: String(isAdditionalOrder)
          }
        })
        console.log('[주문 알림] 고객 푸시 발송 결과:', result)
      } catch (error) {
        console.error('[주문 알림] 고객 푸시 발송 실패:', error)
      }
    }
  }
}

// 주문 취소 알림 발송 (파트너 + 고객) - 카카오톡 알림톡 + 푸시알림
export interface CancellationNotificationParams {
  partnerPhone?: string
  customerPhone?: string
  partnerId?: string
  customerId?: string
  storeName: string
  orderNumber: string
  cancelAmount: number
  refundAmount: number
  refundRate: number
  cancelReason: string
  isPartialCancel: boolean
}

export async function sendCancellationNotification(params: CancellationNotificationParams): Promise<void> {
  const { partnerPhone, customerPhone, partnerId, customerId, isPartialCancel, ...variables } = params

  // 템플릿 불러오기
  const templates = require('@/config/notificationTemplates.json')

  const variablesStr = {
    storeName: variables.storeName,
    orderNumber: variables.orderNumber,
    cancelAmount: variables.cancelAmount.toLocaleString(),
    refundAmount: variables.refundAmount.toLocaleString(),
    refundRate: String(Math.floor(variables.refundRate * 100)),
    cancelReason: variables.cancelReason,
  }

  console.log('[취소 알림] 발송 시작', { isPartialCancel })

  // 파트너 알림 (카카오톡 알림톡 + 푸시)
  if (partnerPhone || partnerId) {
    const templateType = isPartialCancel ? 'partial' : 'full'
    const template = templates.cancellation.partner[templateType]

    // 카카오톡 알림톡 발송
    if (partnerPhone) {
      try {
        const templateCode = template.templateCode

        const kakaoVariables = {
          storeName: variables.storeName,
          orderNumber: variables.orderNumber,
          cancelAmount: variables.cancelAmount.toLocaleString(),
          cancelReason: variables.cancelReason,
        }

        const kakaoResult = await sendKakaoAlimtalk(partnerPhone, templateCode, kakaoVariables)
        console.log('[취소 알림] 파트너 카카오톡 발송 결과:', kakaoResult)
      } catch (error) {
        console.error('[취소 알림] 파트너 카카오톡 발송 실패:', error)
      }
    }

    // 푸시 알림 발송
    if (partnerId) {
      try {
        const pushTitle = replaceTemplateVariables(template.push.title, variablesStr)
        const pushBody = replaceTemplateVariables(template.push.body, variablesStr)

        const result = await sendCancellationFCM({
          userId: partnerId,
          title: pushTitle,
          body: pushBody,
          data: {
            type: 'cancellation',
            orderNumber: variables.orderNumber
          }
        })
        console.log('[취소 알림] 파트너 푸시 발송 결과:', result)
      } catch (error) {
        console.error('[취소 알림] 파트너 푸시 발송 실패:', error)
      }
    }
  }

  // 고객 알림 (카카오톡 알림톡 + 푸시)
  if (customerPhone || customerId) {
    const templateType = isPartialCancel ? 'partial' : 'full'
    const template = templates.cancellation.customer[templateType]

    // 카카오톡 알림톡 발송
    if (customerPhone) {
      try {
        const templateCode = template.templateCode

        const kakaoVariables = {
          storeName: variables.storeName,
          orderNumber: variables.orderNumber,
          refundAmount: variables.refundAmount.toLocaleString(),
          refundRate: String(Math.floor(variables.refundRate * 100)),
          cancelReason: variables.cancelReason,
        }

        const kakaoResult = await sendKakaoAlimtalk(customerPhone, templateCode, kakaoVariables)
        console.log('[취소 알림] 고객 카카오톡 발송 결과:', kakaoResult)
      } catch (error) {
        console.error('[취소 알림] 고객 카카오톡 발송 실패:', error)
      }
    }

    // 푸시 알림 발송
    if (customerId) {
      try {
        const pushTitle = replaceTemplateVariables(template.push.title, variablesStr)
        const pushBody = replaceTemplateVariables(template.push.body, variablesStr)

        const result = await sendCancellationFCM({
          userId: customerId,
          title: pushTitle,
          body: pushBody,
          data: {
            type: 'cancellation',
            orderNumber: variables.orderNumber
          }
        })
        console.log('[취소 알림] 고객 푸시 발송 결과:', result)
      } catch (error) {
        console.error('[취소 알림] 고객 푸시 발송 실패:', error)
      }
    }
  }
}

// 구매확정 알림 발송 (고객에게만) - 카카오톡 알림톡 + 푸시알림
export interface ConfirmationNotificationParams {
  customerPhone?: string
  customerId?: string
  storeName: string
  orderNumber: string
  productName: string
  type: 'reminder' | 'autoConfirmed'
}

export async function sendConfirmationNotification(params: ConfirmationNotificationParams): Promise<void> {
  const { customerPhone, customerId, type, ...variables } = params

  // 템플릿 불러오기
  const templates = require('@/config/notificationTemplates.json')

  const variablesStr = {
    storeName: variables.storeName,
    orderNumber: variables.orderNumber,
    productName: variables.productName,
  }

  console.log('[구매확정 알림] 발송 시작', { type })

  // 고객 알림 (카카오톡 알림톡 + 푸시)
  if (customerPhone || customerId) {
    const template = templates.confirmation.customer[type]

    // 카카오톡 알림톡 발송
    if (customerPhone) {
      try {
        const templateCode = template.templateCode

        const kakaoVariables = {
          storeName: variables.storeName,
          orderNumber: variables.orderNumber,
          productName: variables.productName,
        }

        const kakaoResult = await sendKakaoAlimtalk(customerPhone, templateCode, kakaoVariables)
        console.log('[구매확정 알림] 고객 카카오톡 발송 결과:', kakaoResult)
      } catch (error) {
        console.error('[구매확정 알림] 고객 카카오톡 발송 실패:', error)
      }
    }

    // 푸시 알림 발송
    if (customerId) {
      try {
        const pushTitle = replaceTemplateVariables(template.push.title, variablesStr)
        const pushBody = replaceTemplateVariables(template.push.body, variablesStr)

        const result = await sendCancellationFCM({
          userId: customerId,
          title: pushTitle,
          body: pushBody,
          data: {
            type: type === 'reminder' ? 'ORDER_CONFIRM_REMINDER' : 'ORDER_AUTO_CONFIRMED',
            orderNumber: variables.orderNumber
          }
        })
        console.log('[구매확정 알림] 고객 푸시 발송 결과:', result)
      } catch (error) {
        console.error('[구매확정 알림] 고객 푸시 발송 실패:', error)
      }
    }
  }
}

// SMS 발송 함수는 인증번호 발송용으로만 사용 (서버에서만 호출)
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    const apiKey = process.env.ALIGO_API_KEY
    const userId = process.env.ALIGO_USER_ID
    const sender = process.env.ALIGO_SENDER
    const isDevelopment = process.env.NODE_ENV === 'development'
    const useTestMode = process.env.ALIGO_TEST_MODE === 'true'

    console.log('[Aligo SMS] ENV Check:', {
      hasApiKey: !!apiKey,
      hasUserId: !!userId,
      hasSender: !!sender,
      isDevelopment,
      useTestMode,
    })

    // 개발 환경이고 테스트 모드일 때는 콘솔에만 출력
    if (isDevelopment && useTestMode) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[TEST MODE] SMS 발송 시뮬레이션')
      console.log('수신번호:', phone)
      console.log('메시지:', message)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return true
    }

    if (!apiKey || !userId || !sender) {
      console.error('[Aligo SMS] Missing environment variables')
      return false
    }

    const receiver = phone.replace(/-/g, '') // 하이픈 제거

    console.log('[Aligo SMS] Sending to:', receiver)

    const params = new URLSearchParams({
      key: apiKey,
      user_id: userId,
      sender: sender,
      receiver: receiver,
      msg: message,
      msg_type: 'SMS',
      testmode_yn: '', // 실제 발송
    })

    console.log('[Aligo SMS] Request params:', {
      key: apiKey?.substring(0, 10) + '...',
      user_id: userId,
      sender: sender,
      receiver: receiver,
      msg: message,
      msg_type: 'SMS',
      testmode_yn: params.get('testmode_yn'),
    })

    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const result = await response.json()

    console.log('[Aligo SMS] Full Response:', JSON.stringify(result, null, 2))

    // 알리고 API 응답: result_code가 1이면 성공
    if (result.result_code === '1' || result.result_code === 1) {
      console.log('[Aligo SMS] Success!')
      return true
    } else {
      console.error('[Aligo SMS] Failed:', result.message || result)
      return false
    }
  } catch (error) {
    console.error('[Aligo SMS] Error:', error)
    return false
  }
}
