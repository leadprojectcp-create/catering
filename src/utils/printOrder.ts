/**
 * 주문서 출력 유틸리티
 *
 * 플랫폼별 출력 방식:
 * - 웹 (Windows/Mac): window.print() 사용
 * - Android 네이티브 앱: React Native print 모듈 호출
 * - iOS 네이티브 앱: 지원 안 함 (안내 메시지 표시)
 */

// React Native WebView에서 주입되는 전역 객체 타입 선언
declare global {
  interface Window {
    isNativeApp?: boolean
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
  }
}

// 플랫폼 타입
type Platform = 'web' | 'android' | 'ios'

// 플랫폼 감지
function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'web'

  // React Native 앱에서 주입된 플래그 확인
  const isNativeApp = window.isNativeApp === true

  if (!isNativeApp) return 'web'

  // 네이티브 앱인 경우 iOS/Android 구분
  const userAgent = navigator.userAgent.toLowerCase()

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios'
  }

  if (/android/.test(userAgent)) {
    return 'android'
  }

  return 'web'
}

// 주문서 HTML 생성
function generateOrderHtml(order: {
  orderNumber?: string
  storeName?: string
  buyerInfo?: {
    name?: string
    phone?: string
    address?: string
    detailAddress?: string
  }
  deliveryMethod?: string
  deliveryDate?: string
  deliveryTime?: string
  items?: Array<{
    name: string
    quantity: number
    price: number
    options?: Array<{ name: string; value: string }>
  }>
  totalAmount?: number
  deliveryFee?: number
  memo?: string
}): string {
  const itemsHtml = order.items?.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">
        ${item.name}
        ${item.options?.map(opt => `<br><small style="color: #666;">- ${opt.name}: ${opt.value}</small>`).join('') || ''}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${(item.price * item.quantity).toLocaleString()}원</td>
    </tr>
  `).join('') || ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>주문서 - ${order.orderNumber || ''}</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
        .section { margin-bottom: 15px; }
        .section-title { font-weight: bold; margin-bottom: 5px; border-bottom: 2px solid #000; padding-bottom: 5px; }
        .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #000; }
        .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 10px; }
        .memo { background: #fffbe6; padding: 10px; border: 1px solid #ffd700; margin-top: 10px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>주문서</h1>

      <div class="section">
        <div class="section-title">주문 정보</div>
        <div class="info-row"><span>주문번호:</span><span>${order.orderNumber || '-'}</span></div>
        <div class="info-row"><span>매장명:</span><span>${order.storeName || '-'}</span></div>
        <div class="info-row"><span>배송방법:</span><span>${order.deliveryMethod || '-'}</span></div>
        <div class="info-row"><span>배송일시:</span><span>${order.deliveryDate || '-'} ${order.deliveryTime || ''}</span></div>
      </div>

      <div class="section">
        <div class="section-title">고객 정보</div>
        <div class="info-row"><span>이름:</span><span>${order.buyerInfo?.name || '-'}</span></div>
        <div class="info-row"><span>연락처:</span><span>${order.buyerInfo?.phone || '-'}</span></div>
        <div class="info-row"><span>주소:</span><span>${order.buyerInfo?.address || '-'} ${order.buyerInfo?.detailAddress || ''}</span></div>
      </div>

      <div class="section">
        <div class="section-title">주문 상품</div>
        <table>
          <thead>
            <tr>
              <th>상품명</th>
              <th style="text-align: center;">수량</th>
              <th style="text-align: right;">금액</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="info-row" style="margin-top: 10px;"><span>배송비:</span><span>${(order.deliveryFee || 0).toLocaleString()}원</span></div>
        <div class="total">총 결제금액: ${(order.totalAmount || 0).toLocaleString()}원</div>
      </div>

      ${order.memo ? `<div class="memo"><strong>요청사항:</strong> ${order.memo}</div>` : ''}
    </body>
    </html>
  `
}

// 메인 출력 함수
export async function printOrder(order: Parameters<typeof generateOrderHtml>[0]): Promise<{ success: boolean; message: string }> {
  const platform = detectPlatform()

  console.log('[printOrder] 플랫폼:', platform)

  switch (platform) {
    case 'ios':
      return {
        success: false,
        message: '아이폰에서는 주문서 출력을 지원하지 않습니다.\n윈도우 PC 또는 안드로이드 기기에서 이용해주세요.'
      }

    case 'android':
      // Android 네이티브 앱: WebView를 통해 React Native에 메시지 전송
      try {
        const html = generateOrderHtml(order)

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PRINT_ORDER',
            html: html
          }))
          return { success: true, message: '인쇄 요청을 보냈습니다.' }
        } else {
          // ReactNativeWebView가 없으면 웹 인쇄로 폴백
          window.print()
          return { success: true, message: '인쇄 다이얼로그를 열었습니다.' }
        }
      } catch (error) {
        console.error('[printOrder] Android 인쇄 실패:', error)
        return { success: false, message: '인쇄에 실패했습니다.' }
      }

    case 'web':
    default:
      // 웹: 브라우저 인쇄 기능 사용
      try {
        window.print()
        return { success: true, message: '인쇄 다이얼로그를 열었습니다.' }
      } catch (error) {
        console.error('[printOrder] 웹 인쇄 실패:', error)
        return { success: false, message: '인쇄에 실패했습니다.' }
      }
  }
}

// 플랫폼 확인용 export
export { detectPlatform }
export type { Platform }
