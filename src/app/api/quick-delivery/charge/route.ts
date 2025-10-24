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

interface ChargeRequest {
  topGroupNo: number
  groupNo: number
  customerNo: number
  serviceType: string
  startAddress: string
  destAddress: string
  runtype: number
  reservDatetimeUp?: string
  upWay?: string
  downWay?: string
  deliveryItem: DeliveryItem
}

interface ChargeResponse {
  code: string | number
  data?: {
    detail: {
      [key: string]: {
        label: string
        fee: number
      }
    }
    feeDetails: {
      feeBasic: number
      feeAdd: number
      feeTotal: number
      feeDetail: string
    }
  }
  errMsg?: string
}

/**
 * 후다닥 퀵 배송 로그인
 */
async function loginQuickDelivery(): Promise<HudadaqLoginResponse | null> {
  try {
    console.log('[QuickDelivery Charge API] 로그인 시도...')

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
      console.error('[QuickDelivery Charge API] 로그인 실패:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    console.log('[QuickDelivery Charge API] 로그인 성공:', data)

    return data
  } catch (error) {
    console.error('[QuickDelivery Charge API] 로그인 에러:', error)
    return null
  }
}

/**
 * POST /api/quick-delivery/charge - 퀵 배송 요금 조회
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('[QuickDelivery Charge API] 요금 조회 요청 받음:', body)

    // 1. 먼저 로그인
    const loginData = await loginQuickDelivery()
    if (!loginData || !loginData.userData) {
      console.error('[QuickDelivery Charge API] 로그인 실패 - 조회 불가')
      return NextResponse.json(
        { error: '후다닥 로그인 실패' },
        { status: 401 }
      )
    }

    // 2. 로그인 정보로 요금 조회 요청 데이터 구성
    const chargeRequestData: ChargeRequest = {
      topGroupNo: loginData.userData.topGroupNo,
      groupNo: loginData.userData.groupNo,
      customerNo: loginData.userData.customerNo,
      serviceType: body.serviceType || 'damas', // 기본값: 다마스
      startAddress: body.startAddress,
      destAddress: body.destAddress,
      runtype: body.runtype ?? 0, // 기본값: 일반 배송
      reservDatetimeUp: body.reservDatetimeUp,
      upWay: body.upWay || 'free_customer', // 기본값: 고객님이 상차
      downWay: body.downWay || 'free_customer', // 기본값: 고객님이 하차
      deliveryItem: body.deliveryItem || { bgBox: 1 }, // 기본값: 대박스 1개
    }

    console.log('[QuickDelivery Charge API] 요금 조회 데이터:', chargeRequestData)

    // 3. 요금 조회 API 호출
    const response = await fetch(`${HUDADAQ_API_BASE_URL}/order/charge/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hudadaq-application-token': getAuthHeader(),
      },
      body: JSON.stringify(chargeRequestData),
    })

    if (!response.ok) {
      console.error('[QuickDelivery Charge API] 요금 조회 실패:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('[QuickDelivery Charge API] 에러 응답:', errorText)
      return NextResponse.json(
        { error: '퀵 배송 요금 조회 실패', details: errorText },
        { status: response.status }
      )
    }

    const result: ChargeResponse = await response.json()
    console.log('[QuickDelivery Charge API] 요금 조회 성공:', result)

    // 성공 여부 확인
    if (result.code === 1 || result.code === '1') {
      return NextResponse.json(result, { status: 200 })
    } else {
      // 에러 응답
      return NextResponse.json(
        { error: '요금 조회 실패', errMsg: result.errMsg },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[QuickDelivery Charge API] 에러:', error)
    return NextResponse.json(
      { error: '서버 에러', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
