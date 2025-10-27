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

interface HistoryOrder {
  odrNo: string
  dtRcp: string
  dtRcpAcc: string
  dtAllo: string
  dtPick: string
  dtEnd: string
  sState: string
  orderName: string
  orderPhone: string
  orderDepart: string
  orderManager: string
  startName: string
  startPhone: string
  startDepart: string
  startManager: string
  startAddress: string
  startDetail: string
  startDong: string
  sPosX: number
  sPosY: number
  destName: string
  destPhone: string
  destDepart: string
  destManager: string
  destAddress: string
  destDetail: string
  destDong: string
  dPosX: number
  dPosY: number
  sEtc: string
  fee: string
  feeAdd: string
  feeChargeTrans: string
  feeChargeSum: string
  payType: string
  carType: string
  wayType: string
  runType: string
  rName: string
  rMobile: string
  itemName: string
  chkReserve: number
  reserveTime: string
  tradingStatementUrl: string
}

interface HistoryResponse {
  code: string
  orderList?: HistoryOrder[]
  errMsg?: string
}

/**
 * 후다닥 퀵 배송 로그인
 */
async function loginQuickDelivery(): Promise<HudadaqLoginResponse | null> {
  try {
    console.log('[QuickDelivery History API] 로그인 시도...')

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
      console.error('[QuickDelivery History API] 로그인 실패:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    console.log('[QuickDelivery History API] 로그인 성공')

    return data
  } catch (error) {
    console.error('[QuickDelivery History API] 로그인 에러:', error)
    return null
  }
}

/**
 * POST /api/quick-delivery/history - 퀵 배송 이용내역 조회
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rangeStart, rangeEnd, orderNo } = body

    console.log('[QuickDelivery History API] 이용내역 조회 요청:', { rangeStart, rangeEnd, orderNo })

    if (!rangeStart || !rangeEnd) {
      return NextResponse.json(
        { error: 'rangeStart와 rangeEnd는 필수입니다.' },
        { status: 400 }
      )
    }

    // 1. 먼저 로그인
    const loginData = await loginQuickDelivery()
    if (!loginData || !loginData.userData) {
      console.error('[QuickDelivery History API] 로그인 실패')
      return NextResponse.json(
        { error: '후다닥 로그인 실패' },
        { status: 401 }
      )
    }

    // 2. 이용내역 조회 요청
    const historyRequestData = {
      topGroupNo: loginData.userData.topGroupNo,
      groupNo: loginData.userData.groupNo,
      customerNo: loginData.userData.customerNo,
      rangeStart,
      rangeEnd,
      search: {
        pre: 'Y',
        after: 'Y',
        contract: 'Y',
        transfer: 'Y',
        card: 'Y',
      }
    }

    console.log('[QuickDelivery History API] 이용내역 조회 데이터:', historyRequestData)

    // 3. 이용내역 API 호출
    const response = await fetch(`${HUDADAQ_API_BASE_URL}/history/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hudadaq-application-token': getAuthHeader(),
      },
      body: JSON.stringify(historyRequestData),
    })

    if (!response.ok) {
      console.error('[QuickDelivery History API] 조회 실패:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('[QuickDelivery History API] 에러 응답:', errorText)
      return NextResponse.json(
        { error: '이용내역 조회 실패', details: errorText },
        { status: response.status }
      )
    }

    const result: HistoryResponse = await response.json()
    console.log('[QuickDelivery History API] 조회 성공, 주문 수:', result.orderList?.length || 0)

    // 4. 특정 orderNo가 있으면 해당 주문만 필터링
    if (orderNo) {
      // orderList가 없거나 null인 경우 (테스트 환경)
      if (!result.orderList || result.orderList.length === 0) {
        console.log('[QuickDelivery History API] orderList가 비어있음 (테스트 환경 또는 배차 대기중)')
        return NextResponse.json({
          code: result.code,
          order: null,
          message: '배차 대기중입니다.',
          testing: result.testing || false
        }, { status: 200 })
      }

      const targetOrder = result.orderList.find(order => order.odrNo === String(orderNo))

      if (targetOrder) {
        console.log('[QuickDelivery History API] 주문 찾음:', orderNo)
        return NextResponse.json({
          code: result.code,
          order: targetOrder
        }, { status: 200 })
      } else {
        console.log('[QuickDelivery History API] 주문을 찾을 수 없음:', orderNo)
        return NextResponse.json({
          code: result.code,
          order: null,
          message: '배차 대기중입니다.'
        }, { status: 200 })
      }
    }

    // 5. orderNo가 없으면 전체 목록 반환
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[QuickDelivery History API] 에러:', error)
    return NextResponse.json(
      { error: '서버 에러', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
