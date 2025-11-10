import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { requestQuickDelivery } from '@/lib/services/quickDeliveryService'
import crypto from 'crypto'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// PortOne V2 웹훅
export async function POST(request: NextRequest) {
  try {
    // 웹훅 시크릿으로 서명 검증
    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Webhook] PORTONE_WEBHOOK_SECRET is not set')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // 요청 바디 읽기
    const rawBody = await request.text()
    const signature = request.headers.get('portone-signature')

    if (!signature) {
      console.error('[Webhook] Missing PortOne signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // 서명 검증
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('[Webhook] Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // 웹훅 데이터 파싱
    const webhookData = JSON.parse(rawBody)
    console.log('[Webhook V2] PortOne 웹훅 수신:', {
      type: webhookData.type,
      paymentId: webhookData.data?.paymentId,
      status: webhookData.data?.status,
    })

    // 결제 완료 웹훅 처리
    if (webhookData.type === 'Transaction.Paid') {
      const paymentId = webhookData.data.paymentId
      console.log('[Webhook V2] 결제 완료 이벤트!')
      console.log('[Webhook V2] paymentId:', paymentId)

      // paymentId에서 orderId 추출 (format: payment-{orderId}-{timestamp})
      const orderIdMatch = paymentId.match(/^payment-(.+)-\d+$/)
      if (!orderIdMatch) {
        console.error('[Webhook V2] Invalid paymentId format:', paymentId)
        return NextResponse.json({ success: true, message: 'Invalid paymentId format' })
      }

      const orderId = orderIdMatch[1]
      console.log('[Webhook V2] Extracted orderId:', orderId)

      // Firestore에서 주문 정보 조회
      const orderRef = doc(db, 'orders', orderId)
      const orderDoc = await getDoc(orderRef)

      if (orderDoc.exists()) {
        const orderData = orderDoc.data()
        const storeId = orderData?.storeId

        console.log(`[Webhook V2] 주문 데이터:`, {
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

            console.log(`[Webhook V2] 가게 정보:`, {
              storeId,
              partnerPhone,
              storeName: storeData?.storeName,
            })

            // 퀵배송 요청
            if (orderData.deliveryMethod === '퀵업체 배송' && !orderData.quickDeliveryOrderNo) {
              try {
                console.log(`[Webhook V2] 퀵배송 요청 시작`)
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
                console.error('[Webhook V2] 퀵배송 요청 실패:', quickError)
              }
            }
          }
        }
      } else {
        console.error('[Webhook V2] 주문 정보를 찾을 수 없음:', orderId)
      }

      return NextResponse.json({ success: true })
    }

    // 다른 웹훅 타입 처리
    console.log('[Webhook V2] Unhandled webhook type:', webhookData.type)

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
    })
  } catch (error) {
    console.error('[Webhook V2] 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
