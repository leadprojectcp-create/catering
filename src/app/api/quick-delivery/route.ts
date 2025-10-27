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

    const response = await fetch(`${HUDADAQ_API_BASE_URL}/member/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hudadaq-application-token': getAuthHeader(),
      },
      body: JSON.stringify({
        loginID: QUICK_LOGIN_ID,
        passWd: QUICK_PASSWORD,
      }),
    })

    if (!response.ok) {
      console.error('[QuickDelivery API] 로그인 실패:', response.status, response.statusText)
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
      serviceType: 'damas', // 다마스
      upWay: 'free_customer', // 고객님이 상차
      downWay: 'free_customer', // 고객님이 하차
      deliveryItem: { bgBox: 3 }, // 대박스 1개
      ...body,
    }

    console.log('[QuickDelivery API] 주문 데이터:', fullOrderData)

    // 3. 주문 API 호출
    const response = await fetch(`${HUDADAQ_API_BASE_URL}/order/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hudadaq-application-token': getAuthHeader(),
      },
      body: JSON.stringify(fullOrderData),
    })

    if (!response.ok) {
      console.error('[QuickDelivery API] 주문 실패:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('[QuickDelivery API] 에러 응답:', errorText)
      return NextResponse.json(
        { error: '퀵 배송 주문 실패', details: errorText },
        { status: response.status }
      )
    }

    const result: QuickOrderResponse = await response.json()
    console.log('[QuickDelivery API] 주문 성공:', result)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[QuickDelivery API] 에러:', error)
    return NextResponse.json(
      { error: '서버 에러', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
