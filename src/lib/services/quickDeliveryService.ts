const HUDADAQ_API_BASE_URL = process.env.HUDADAQ_API_BASE_URL || 'https://api.hudadaq.com/v3'
const HUDADAQ_API_KEY = process.env.HUDADAQ_API_KEY!
const QUICK_LOGIN_ID = process.env.HUDADAQ_LOGIN_ID!
const QUICK_PASSWORD = process.env.HUDADAQ_PASSWORD!

// API 키를 base64로 인코딩
const getAuthHeader = () => {
  if (!HUDADAQ_API_KEY) {
    throw new Error('HUDADAQ_API_KEY environment variable is not set')
  }
  const base64ApiKey = Buffer.from(HUDADAQ_API_KEY).toString('base64')
  return base64ApiKey
}

interface HudadaqLoginResponse {
  code: string
  userData: {
    topGroupNo: number
    groupNo: number
    customerNo: number
    uniqKey: string
    cName: string
    dept: string
    name: string
    tel: string
    addr: string
    detail: string
    eMail: string
  }
}

interface DeliveryItem {
  xsItem?: number
  smItem?: number
  smBox?: number
  mbBox?: number
  bgBox?: number
  palette?: number
}

interface QuickOrderRequest {
  topGroupNo: number
  groupNo: number
  customerNo: number
  serviceType: string
  startCName?: string
  startDept?: string
  startManager?: string
  startPhone: string
  startAddress: string
  startAddressDetail: string
  destCName?: string
  destDept?: string
  destManager?: string
  destPhone: string
  destAddress: string
  destAddressDetail: string
  runtype: number
  payType: string
  shuttle?: string
  rideTogether?: string
  reservDatetimeUp?: string
  hddMemo?: string
  upWay?: string
  downWay?: string
  deliveryItem: DeliveryItem
}

interface QuickOrderResponse {
  code: string | number
  message?: string
  errMsg?: string
  orderNo?: number
  orderInfo?: {
    feeTotal?: number
    feeDetail?: string
  }
  [key: string]: unknown
}

/**
 * 후다닥 퀵 배송 로그인
 */
async function loginQuickDelivery(): Promise<HudadaqLoginResponse | null> {
  try {
    console.log('[QuickDelivery] 로그인 시도...')
    console.log('[QuickDelivery] API URL:', `${HUDADAQ_API_BASE_URL}/member/login/`)
    console.log('[QuickDelivery] Login ID:', QUICK_LOGIN_ID)
    console.log('[QuickDelivery] API Key 존재 여부:', !!HUDADAQ_API_KEY)

    const authHeader = getAuthHeader()
    console.log('[QuickDelivery] Base64 인코딩된 Auth Header 길이:', authHeader.length)

    const response = await fetch(`${HUDADAQ_API_BASE_URL}/member/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hudadaq-application-token': authHeader,
      },
      body: JSON.stringify({
        loginID: QUICK_LOGIN_ID,
        passWd: QUICK_PASSWORD,
      }),
    })

    console.log('[QuickDelivery] 로그인 응답 상태:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[QuickDelivery] 로그인 실패:', response.status, response.statusText)
      console.error('[QuickDelivery] 로그인 에러 응답:', errorText.substring(0, 500))
      return null
    }

    const data = await response.json()
    console.log('[QuickDelivery] 로그인 성공:', data)

    return data
  } catch (error) {
    console.error('[QuickDelivery] 로그인 에러:', error)
    return null
  }
}

/**
 * 퀵 배송 주문 요청
 */
export async function requestQuickDelivery(orderData: Partial<QuickOrderRequest>): Promise<QuickOrderResponse> {
  try {
    console.log('[QuickDelivery] 주문 요청 시작:', orderData)

    // 1. 먼저 로그인
    const loginData = await loginQuickDelivery()
    if (!loginData || !loginData.userData) {
      console.error('[QuickDelivery] 로그인 실패 - 주문 불가')
      return {
        code: 'LOGIN_FAILED',
        error: '후다닥 로그인 실패'
      }
    }

    // 2. 로그인 정보로 주문 요청 데이터 구성
    const fullOrderData: QuickOrderRequest = {
      ...orderData as QuickOrderRequest,
      topGroupNo: loginData.userData.topGroupNo,
      groupNo: loginData.userData.groupNo,
      customerNo: loginData.userData.customerNo,
      serviceType: orderData.serviceType || 'damas',
      runtype: orderData.runtype !== undefined ? orderData.runtype : 0,
      payType: orderData.payType || 'contract',
      upWay: orderData.upWay || 'free_customer',
      downWay: orderData.downWay || 'free_customer',
      deliveryItem: orderData.deliveryItem || { bgBox: 3 },
    }

    console.log('[QuickDelivery] 주문 데이터:', fullOrderData)

    // 3. 주문 API 호출
    const response = await fetch(`${HUDADAQ_API_BASE_URL}/order/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hudadaq-application-token': getAuthHeader(),
      },
      body: JSON.stringify(fullOrderData),
    })

    console.log('[QuickDelivery] 주문 응답 상태:', response.status)
    console.log('[QuickDelivery] 주문 응답 Content-Type:', response.headers.get('content-type'))

    const responseText = await response.text()
    console.log('[QuickDelivery] 주문 응답 본문 (처음 500자):', responseText.substring(0, 500))

    let result: QuickOrderResponse
    try {
      result = JSON.parse(responseText)
      console.log('[QuickDelivery] 주문 파싱 성공:', result)
    } catch (parseError) {
      console.error('[QuickDelivery] JSON 파싱 실패:', parseError)
      console.error('[QuickDelivery] 응답 텍스트:', responseText.substring(0, 1000))
      return {
        code: 'PARSE_ERROR',
        error: 'JSON 파싱 실패',
        details: responseText.substring(0, 500)
      }
    }

    return result
  } catch (error) {
    console.error('[QuickDelivery] 에러:', error)
    return {
      code: 'ERROR',
      error: '서버 에러',
      details: error instanceof Error ? error.message : String(error)
    }
  }
}
