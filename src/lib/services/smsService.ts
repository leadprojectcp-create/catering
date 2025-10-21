/**
 * 알리고(Aligo) SMS 발송 서비스
 */

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

    // 템플릿 변수를 메시지로 치환
    let message = `[단모] 신규주문이 들어왔습니다.\n\n`
    message += `가게명: ${String(variables.storeName)}\n`
    message += `주문번호: ${String(variables.orderNumber)}\n`
    message += `총 수량: ${String(variables.totalQuantity)}개\n`
    message += `상품금액: ${String(variables.totalProductPrice)}원\n\n`
    message += `주문을 확인하려면 아래 버튼을 클릭해주세요.`

    const params = new URLSearchParams({
      apikey: apiKey,
      userid: userId,
      senderkey: senderKey,
      tpl_code: templateCode,
      sender: sender,
      receiver_1: receiver,
      subject_1: '신규주문알림',
      message_1: message,
      button_1: JSON.stringify({
        button: [
          {
            name: '주문확인',
            linkType: 'WL',
            linkTypeName: '웹링크',
            linkM: 'https://danchemoim.com/partner/order/history/',
            linkP: 'https://danchemoim.com/partner/order/history/',
          },
        ],
      }),
    })

    console.log('[Aligo 카카오톡] Request params:', {
      apikey: apiKey?.substring(0, 10) + '...',
      userid: userId,
      senderkey: senderKey?.substring(0, 10) + '...',
      tpl_code: templateCode,
      sender: sender,
      receiver_1: receiver,
      subject_1: '신규주문알림',
      message_1: message,
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

// 알리고 SMS 발송 (서버에서만 호출)
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
