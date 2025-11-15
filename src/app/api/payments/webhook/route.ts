import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { requestQuickDelivery } from '@/lib/services/quickDeliveryService'
import crypto from 'crypto'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// PortOne V2 웹훅
export async function POST(request: NextRequest) {
  try {
    // 요청 바디 읽기
    const rawBody = await request.text()

    console.log('[Webhook V2] 웹훅 요청 수신')
    console.log('[Webhook V2] Headers:', Object.fromEntries(request.headers.entries()))

    // 웹훅 시크릿으로 서명 검증
    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Webhook] PORTONE_WEBHOOK_SECRET is not set')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // PortOne V2 웹훅은 Standard Webhooks 스펙 사용
    const signature = request.headers.get('webhook-signature')
    const webhookId = request.headers.get('webhook-id')
    const webhookTimestamp = request.headers.get('webhook-timestamp')

    if (signature && webhookId && webhookTimestamp) {
      console.log('[Webhook V2] Standard Webhooks signature verification')

      try {
        // Standard Webhooks 서명 검증
        // 1. 서명할 메시지 생성: msg_id.timestamp.payload
        const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`

        console.log('[Webhook V2] Webhook ID:', webhookId)
        console.log('[Webhook V2] Webhook Timestamp:', webhookTimestamp)
        console.log('[Webhook V2] Raw Body length:', rawBody.length)
        console.log('[Webhook V2] Signed Content (first 100 chars):', signedContent.substring(0, 100))

        // 2. whsec_ 접두사 제거 후 base64 디코드
        const secret = webhookSecret.startsWith('whsec_')
          ? webhookSecret.substring(7)
          : webhookSecret

        console.log('[Webhook V2] Secret (after whsec_ removal, first 20):', secret.substring(0, 20))

        // 3. HMAC-SHA256으로 서명 생성
        const expectedSignature = crypto
          .createHmac('sha256', Buffer.from(secret, 'base64'))
          .update(signedContent, 'utf8')
          .digest('base64')

        console.log('[Webhook V2] Expected signature:', expectedSignature)

        // 4. 서명 형식: v1,<signature> (공백으로 여러 서명 구분 가능)
        const signatures = signature.split(' ')
        let verified = false

        for (const sig of signatures) {
          const [version, receivedSig] = sig.split(',')
          if (version === 'v1' && receivedSig === expectedSignature) {
            verified = true
            break
          }
        }

        if (!verified) {
          console.error('[Webhook V2] Invalid webhook signature')
          console.error('[Webhook V2] Expected (v1):', expectedSignature)
          console.error('[Webhook V2] Received:', signature)
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          )
        }

        console.log('[Webhook V2] Signature verified successfully')
      } catch (error) {
        console.error('[Webhook V2] Signature verification error:', error)
        return NextResponse.json(
          { error: 'Signature verification failed' },
          { status: 401 }
        )
      }
    } else {
      console.warn('[Webhook V2] Missing webhook signature headers')
      return NextResponse.json(
        { error: 'Missing signature headers' },
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

    // 결제 취소(환불) 완료 웹훅 처리
    if (webhookData.type === 'Transaction.Cancelled') {
      const paymentId = webhookData.data.paymentId
      const cancelledAmount = webhookData.data.cancelledAmount
      const cancelledAt = webhookData.data.cancelledAt

      console.log('[Webhook V2] 결제 취소(환불) 완료 이벤트!')
      console.log('[Webhook V2] paymentId:', paymentId)
      console.log('[Webhook V2] cancelledAmount:', cancelledAmount)

      // paymentId에서 orderId 추출 (format: payment-{orderId}-{timestamp})
      const orderIdMatch = paymentId.match(/^payment-(.+)-\d+$/)
      if (!orderIdMatch) {
        console.error('[Webhook V2] Invalid paymentId format:', paymentId)
        return NextResponse.json({ success: true, message: 'Invalid paymentId format' })
      }

      const orderId = orderIdMatch[1]
      console.log('[Webhook V2] Extracted orderId:', orderId)

      // Firestore에서 주문 정보 업데이트
      const orderRef = doc(db, 'orders', orderId)
      const orderDoc = await getDoc(orderRef)

      if (orderDoc.exists()) {
        const orderData = orderDoc.data()
        const existingPaymentInfo = orderData.paymentInfo || []

        // 환불 정보를 paymentInfo 배열에 추가
        const cancelInfo = {
          paymentId: paymentId,
          paidAt: new Date(cancelledAt || Date.now()),
          cancelledAt: new Date(cancelledAt || Date.now()),
          amount: cancelledAmount,
          status: 'cancelled',
          method: 'refund'
        }

        // paymentStatus를 'refunded'로 변경하고 환불 정보 추가
        await updateDoc(orderRef, {
          paymentStatus: 'refunded',
          orderStatus: 'cancelled',
          paymentInfo: [...existingPaymentInfo, cancelInfo],
          updatedAt: new Date()
        })

        console.log('[Webhook V2] 주문 상태 업데이트 완료:', {
          orderId,
          paymentStatus: 'refunded',
          orderStatus: 'cancelled',
          cancelledAmount
        })
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
