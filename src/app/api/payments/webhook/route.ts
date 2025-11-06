import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { requestQuickDelivery } from '@/lib/services/quickDeliveryService'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// PortOne V1/V2 웹훅 (호환)
export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()

    console.log('[Webhook] PortOne 웹훅 수신:', webhookData)

    // V2 웹훅 형식 체크 (type 필드 존재)
    if (webhookData.type) {
      console.log('[Webhook] V2 형식 감지 - 무시함 (V1 API 사용 중)')
      return NextResponse.json({ success: true, message: 'V2 webhook ignored' })
    }

    // V1 웹훅 처리
    const { imp_uid, merchant_uid, status } = webhookData

    // 필수 필드 확인
    if (!imp_uid || !merchant_uid) {
      console.log('[Webhook] V1 필수 필드 누락:', webhookData)
      return NextResponse.json({ success: true, message: 'Missing required fields' })
    }

    // 결제 완료 상태 확인
    if (status !== 'paid') {
      console.log(`[Webhook] 결제 상태가 paid가 아님: ${status}`)
      return NextResponse.json({ success: true, message: 'Not a paid status' })
    }

    console.log('[Webhook V1] 결제 완료 이벤트!')
    console.log('[Webhook V1] imp_uid:', imp_uid)
    console.log('[Webhook V1] merchant_uid:', merchant_uid)

    // PortOne V1 액세스 토큰 발급
    const tokenResponse = await fetch('https://api.iamport.kr/users/getToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imp_key: process.env.PORTONE_API_KEY,
        imp_secret: process.env.PORTONE_API_SECRET,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('[Webhook V1] 토큰 발급 실패')
      return NextResponse.json({ error: 'Token generation failed' }, { status: 500 })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.response.access_token

    // 결제 정보 검증
    const paymentResponse = await fetch(
      `https://api.iamport.kr/payments/${encodeURIComponent(imp_uid)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!paymentResponse.ok) {
      console.error('[Webhook V1] 결제 검증 실패')
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const paymentData = await paymentResponse.json()
    const payment = paymentData.response

    console.log('[Webhook V1] 결제 검증 완료:', {
      imp_uid: payment.imp_uid,
      status: payment.status,
      amount: payment.amount,
    })

    // merchant_uid에서 orderId 추출
    // 형식: order-{orderId}-{timestamp}
    const orderId = merchant_uid.replace(/^order-/, '').replace(/-\d+$/, '')

    console.log('[Webhook V1] merchant_uid:', merchant_uid)
    console.log('[Webhook V1] Extracted orderId:', orderId)

    // Firestore에서 주문 정보 조회
    if (orderId) {
      const orderRef = doc(db, 'orders', orderId)
      const orderDoc = await getDoc(orderRef)

      if (orderDoc.exists()) {
        const orderData = orderDoc.data()
        const storeId = orderData?.storeId

        console.log(`[Webhook V1] 주문 데이터:`, {
          orderId,
          storeId,
          storeName: orderData?.storeName,
          orderNumber: orderData?.orderNumber,
        })

        if (storeId) {
          // 가게 정보 조회
          const storeRef = doc(db, 'stores', storeId)
          const storeDoc = await getDoc(storeRef)

          if (storeDoc.exists()) {
            const storeData = storeDoc.data()
            const partnerPhone = storeData?.phone

            console.log(`[Webhook V1] 가게 정보:`, {
              storeId,
              partnerPhone,
              storeName: storeData?.storeName,
            })

            // 퀵배송 요청
            if (orderData.deliveryMethod === '퀵업체 배송' && !orderData.quickDeliveryOrderNo) {
              try {
                console.log(`[Webhook V1] 퀵배송 요청 시작`)
                const quickDeliveryData = {
                  startPhone: orderData.storePhone || '',
                  startAddress: orderData.storeAddress || '',
                  startAddressDetail: orderData.storeAddressDetail || '',
                  destPhone: orderData.phone || '',
                  destAddress: orderData.address || '',
                  destAddressDetail: orderData.addressDetail || '',
                  hddMemo: orderData.requirements || ''
                }
                await requestQuickDelivery(quickDeliveryData)
              } catch (quickError) {
                console.error('[Webhook V1] 퀵배송 요청 실패:', quickError)
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Webhook V1] 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
