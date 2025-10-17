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
