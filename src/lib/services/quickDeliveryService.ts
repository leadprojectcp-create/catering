// 퀵 배송 API 서비스 (후다닥)

const HUDADAQ_API_BASE_URL = process.env.HUDADAQ_API_BASE_URL || 'https://api.hudadaq.com/v3'

// 퀵 배송 API 키 및 로그인 정보 (환경 변수에서 로드)
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
  serviceType: string        // 차량 종류
  startCName?: string         // 출발지 상호
  startDept?: string          // 출발지 부서명
  startManager?: string       // 출발지 담당자명
  startPhone: string          // 출발지 연락처 (필수)
  startAddress: string        // 출발지 주소 (필수)
  startAddressDetail: string  // 출발지 상세주소 (필수)
  destCName?: string          // 도착지 상호
  destDept?: string           // 도착지 부서명
  destManager?: string        // 도착지 담당자명
  destPhone: string           // 도착지 연락처 (필수)
  destAddress: string         // 도착지 주소 (필수)
  destAddressDetail: string   // 도착지 상세주소 (필수)
  runtype: number             // 배송 방법 (0=일반배송, 2=빠른배차, 3=긴급배차)
  payType: string             // 결제방법 (contract=법인후불, after_cash=착불(현금))
  shuttle?: string            // 왕복 여부 (Y=왕복)
  rideTogether?: string       // 동승 여부 (Y=동승)
  reservDatetimeUp?: string   // 예약일시 (공란시 현재 시각)
  hddMemo?: string            // 물품 상세 내용 및 추가 전달사항
  upWay?: string              // 상차방법 (다마스, 라보 차량 필수)
  downWay?: string            // 하차방법 (다마스, 라보 차량 필수)
  deliveryItem: DeliveryItem  // 물품 객체 (필수, 최소 1개 이상)
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

interface OrderData {
  deliveryInfo?: {
    addressName?: string
    deliveryDate?: string
    deliveryTime?: string
    address?: string
    detailAddress?: string
    recipient?: string
    recipientPhone?: string
    deliveryRequest?: string
    detailedRequest?: string
  }
  [key: string]: unknown
}

interface StoreData {
  storeName?: string
  phone?: string
  address?: {
    city?: string
    district?: string
    dong?: string
    detail?: string
  }
  [key: string]: unknown
}

/**
 * 후다닥 퀵 배송 로그인
 */
export async function loginQuickDelivery(): Promise<HudadaqLoginResponse | null> {
  try {
    console.log('[QuickDelivery] 로그인 시도...')

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
      console.error('[QuickDelivery] 로그인 실패:', response.status, response.statusText)
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
export async function requestQuickDelivery(
  orderData: Omit<QuickOrderRequest, 'topGroupNo' | 'groupNo' | 'customerNo'>
): Promise<QuickOrderResponse | null> {
  try {
    console.log('[QuickDelivery] 퀵 배송 주문 시작...')

    // 1. 먼저 로그인
    const loginData = await loginQuickDelivery()
    if (!loginData || !loginData.userData) {
      console.error('[QuickDelivery] 로그인 실패 - 주문 불가')
      return null
    }

    // 2. 로그인 정보로 주문 요청
    const fullOrderData: QuickOrderRequest = {
      topGroupNo: loginData.userData.topGroupNo,
      groupNo: loginData.userData.groupNo,
      customerNo: loginData.userData.customerNo,
      ...orderData,
    }

    console.log('[QuickDelivery] 주문 데이터:', fullOrderData)

    const response = await fetch(`${HUDADAQ_API_BASE_URL}/order/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hudadaq-application-token': getAuthHeader(),
      },
      body: JSON.stringify(fullOrderData),
    })

    if (!response.ok) {
      console.error('[QuickDelivery] 주문 실패:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('[QuickDelivery] 에러 응답:', errorText)
      return null
    }

    const result = await response.json()
    console.log('[QuickDelivery] 주문 성공:', result)

    return result
  } catch (error) {
    console.error('[QuickDelivery] 주문 에러:', error)
    return null
  }
}

/**
 * 주문 정보에서 퀵 배송 요청 데이터 생성
 */
export function createQuickDeliveryData(
  orderInfo: OrderData,
  storeInfo: StoreData
): Omit<QuickOrderRequest, 'topGroupNo' | 'groupNo' | 'customerNo'> {
  // 배송 방법 설정 (고정값: 일반 배송)
  const runtype = 0 // 0=일반배송, 2=빠른배차, 3=긴급배차

  // 결제 방법 설정 (고정값: 법인후불)
  const payType = 'contract' // contract=법인후불, after_cash=착불(현금)

  // 차량 종류 설정 (고정값: 다마스)
  const serviceType = 'damas' // damas로 고정

  // 물품 정보 설정 (고정값: 대박스 1개)
  const deliveryItem: DeliveryItem = {
    bgBox: 1, // 대박스(대봉, 종이컵박스) 1개
  }

  // deliveryInfo에서 배송 정보 추출
  const deliveryInfo = orderInfo?.deliveryInfo || {}

  // 출발지 주소 조합 (stores 컬렉션의 address 맵)
  const startAddress = storeInfo?.address
    ? `${storeInfo.address.city || ''} ${storeInfo.address.district || ''} ${storeInfo.address.dong || ''}`.trim()
    : ''

  // 예약일시 조합 (deliveryDate + deliveryTime)
  const reservDatetimeUp = deliveryInfo.deliveryDate && deliveryInfo.deliveryTime
    ? `${deliveryInfo.deliveryDate} ${deliveryInfo.deliveryTime}:00`
    : undefined

  return {
    serviceType,
    // 출발지 (가게 정보)
    startCName: storeInfo?.storeName || '', // 출발지 상호
    startManager: storeInfo?.storeName || '', // 출발지 담당자명
    startPhone: storeInfo?.phone || '', // 출발지 연락처
    startAddress: startAddress, // 출발지 주소 (city + district + dong)
    startAddressDetail: storeInfo?.address?.detail || '', // 출발지 상세주소
    // 도착지 (deliveryInfo 맵)
    destCName: deliveryInfo.addressName || '', // 도착지 상호 (배송지명)
    destManager: deliveryInfo.recipient || '', // 도착지 담당자명 (받는 사람)
    destPhone: deliveryInfo.recipientPhone || '', // 도착지 연락처
    destAddress: deliveryInfo.address || '', // 도착지 주소
    destAddressDetail: deliveryInfo.detailAddress || '', // 도착지 상세주소
    // 배송 설정
    runtype, // 0으로 고정
    payType, // contract로 고정
    // 예약일시 (deliveryDate + deliveryTime)
    reservDatetimeUp,
    // 메모 (상세 요청사항)
    hddMemo: deliveryInfo.detailedRequest || '',
    // 상하차 방법 (고정값: 기사님 혼자)
    upWay: 'full', // full로 고정
    downWay: 'full', // full로 고정
    // 물품 정보
    deliveryItem,
  }
}
