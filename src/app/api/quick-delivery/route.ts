import { NextRequest, NextResponse } from 'next/server'

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
  xsItem?: number  // 극소형물품(서류, USB)
  smItem?: number  // 소형물품(소형택배, 휴대폰, 카메라)
  smBox?: number   // 소박스(A4용지 박스, 쇼핑백, 노트북)
  mbBox?: number   // 중박스(라면박스, PC, 중봉)
  bgBox?: number   // 대박스(대봉, 종이컵박스)
  palette?: number // 팔레트(팔레트)
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
  code: string
  message?: string
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
    console.log('[QuickDelivery API] 로그인 시도...')
    console.log('[QuickDelivery API] API URL:', `${HUDADAQ_API_BASE_URL}/member/login/`)
    console.log('[QuickDelivery API] Login ID:', QUICK_LOGIN_ID)
    console.log('[QuickDelivery API] API Key 존재 여부:', !!HUDADAQ_API_KEY)
    console.log('[QuickDelivery API] API Key 길이:', HUDADAQ_API_KEY?.length)

    const authHeader = getAuthHeader()
    console.log('[QuickDelivery API] Base64 인코딩된 Auth Header 길이:', authHeader.length)

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

    console.log('[QuickDelivery API] 로그인 응답 상태:', response.status)
    console.log('[QuickDelivery API] 로그인 응답 헤더:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[QuickDelivery API] 로그인 실패:', response.status, response.statusText)
      console.error('[QuickDelivery API] 로그인 에러 응답:', errorText.substring(0, 500))
      return null
    }

    const data = await response.json()
    console.log('[QuickDelivery API] 로그인 성공:', data)

    return data
  } catch (error) {
    console.error('[QuickDelivery API] 로그인 에러:', error)
    return null
  }
}

/**
 * POST /api/quick-delivery - 퀵 배송 주문 요청
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('[QuickDelivery API] 주문 요청 받음:', body)

    // 1. 먼저 로그인
    const loginData = await loginQuickDelivery()
    if (!loginData || !loginData.userData) {
      console.error('[QuickDelivery API] 로그인 실패 - 주문 불가')
      return NextResponse.json(
        { error: '후다닥 로그인 실패' },
        { status: 401 }
      )
    }

    // 2. 로그인 정보로 주문 요청 데이터 구성
    const fullOrderData: QuickOrderRequest = {
      topGroupNo: loginData.userData.topGroupNo,
      groupNo: loginData.userData.groupNo,
      customerNo: loginData.userData.customerNo,
      serviceType: body.serviceType || 'damas', // 다마스 (기본값)
      runtype: body.runtype !== undefined ? body.runtype : 0, // 0 = 일반 배송 (필수)
      payType: body.payType || 'contract', // 법인후불 (필수)
      upWay: body.upWay || 'free_customer', // 고객님이 상차
      downWay: body.downWay || 'free_customer', // 고객님이 하차
      deliveryItem: body.deliveryItem || { bgBox: 3 }, // 대박스 3개 (기본값)
      ...body,
    }

    console.log('[QuickDelivery API] 주문 데이터:', fullOrderData)

    // 3. 주문 API 호출
    console.log('[QuickDelivery API] 주문 API 호출 URL:', `${HUDADAQ_API_BASE_URL}/order/`)
    const response = await fetch(`${HUDADAQ_API_BASE_URL}/order/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hudadaq-application-token': getAuthHeader(),
      },
      body: JSON.stringify(fullOrderData),
    })

    console.log('[QuickDelivery API] 주문 응답 상태:', response.status)
    console.log('[QuickDelivery API] 주문 응답 Content-Type:', response.headers.get('content-type'))

    if (!response.ok) {
      console.error('[QuickDelivery API] 주문 실패:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('[QuickDelivery API] 에러 응답:', errorText.substring(0, 1000))
      return NextResponse.json(
        { error: '퀵 배송 주문 실패', details: errorText.substring(0, 500) },
        { status: response.status }
      )
    }

    // JSON 파싱 전에 응답 텍스트 확인
    const responseText = await response.text()
    console.log('[QuickDelivery API] 주문 응답 본문 (처음 500자):', responseText.substring(0, 500))

    let result: QuickOrderResponse
    try {
      result = JSON.parse(responseText)
      console.log('[QuickDelivery API] 주문 성공:', result)
    } catch (parseError) {
      console.error('[QuickDelivery API] JSON 파싱 실패:', parseError)
      console.error('[QuickDelivery API] 응답 텍스트:', responseText.substring(0, 1000))
      return NextResponse.json(
        { error: 'JSON 파싱 실패', details: responseText.substring(0, 500) },
        { status: 500 }
      )
    }

    // code가 "1" 또는 "0000"이면 성공 (후다닥 API는 "1"을 성공으로 반환)
    if (result.code === '1' || result.code === '0000') {
      return NextResponse.json({
        success: true,
        data: {
          orderNo: result.orderNo,
          code: result.code,
          orderInfo: result.orderInfo,
          testing: result.testing
        }
      }, { status: 200 })
    } else {
      return NextResponse.json({
        success: false,
        error: result.errMsg || result.message || '퀵 배송 요청 실패',
        errMsg: result.errMsg || result.message,
        code: result.code
      }, { status: 400 })
    }
  } catch (error) {
    console.error('[QuickDelivery API] 에러:', error)
    return NextResponse.json(
      { success: false, error: '서버 에러', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
