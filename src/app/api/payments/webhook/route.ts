import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { requestQuickDelivery } from '@/lib/services/quickDeliveryService'
import * as PortOne from '@portone/server-sdk'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// PortOne V2 웹훅
export async function POST(request: NextRequest) {
  try {
    // 요청 바디 읽기
    const rawBody = await request.text()

    console.log('[Webhook V2] 웹훅 요청 수신')

    // 웹훅 시크릿으로 서명 검증
    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Webhook] PORTONE_WEBHOOK_SECRET is not set')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // PortOne V2 SDK를 사용한 웹훅 검증
    try {
      const webhook = await PortOne.Webhook.verify(
        webhookSecret,
        rawBody,
        Object.fromEntries(request.headers.entries())
      )

      console.log('[Webhook V2] 서명 검증 성공')
    } catch (error) {
      console.error('[Webhook V2] 웹훅 서명 검증 실패:', error)

      if (error instanceof PortOne.Webhook.WebhookVerificationError) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }

      throw error
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

      // paymentId 필드로 주문 검색
      const ordersRef = collection(db, 'orders')
      const q = query(ordersRef, where('paymentId', 'array-contains', paymentId))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        console.error('[Webhook V2] 주문 정보를 찾을 수 없음:', paymentId)
        return NextResponse.json({ success: true, message: 'Order not found' })
      }

      const orderDoc = querySnapshot.docs[0]
      const orderId = orderDoc.id

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

      // 전체 데이터 로깅하여 구조 확인
      console.log('[Webhook V2] 결제 취소(환불) 완료 이벤트!')
      console.log('[Webhook V2] 전체 webhookData:', JSON.stringify(webhookData, null, 2))
      console.log('[Webhook V2] paymentId:', paymentId)

      const cancelledAmount = webhookData.data.cancelledAmount || webhookData.data.amount || 0
      const cancelledAt = webhookData.data.cancelledAt || webhookData.data.canceledAt || new Date().toISOString()

      console.log('[Webhook V2] cancelledAmount:', cancelledAmount)
      console.log('[Webhook V2] cancelledAt:', cancelledAt)

      // paymentId 필드로 주문 검색
      const ordersRef = collection(db, 'orders')
      const q = query(ordersRef, where('paymentId', 'array-contains', paymentId))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        console.error('[Webhook V2] 주문 정보를 찾을 수 없음:', paymentId)
        return NextResponse.json({ success: true, message: 'Order not found' })
      }

      const orderDoc = querySnapshot.docs[0]
      const orderId = orderDoc.id
      const orderRef = doc(db, 'orders', orderId)

      if (orderDoc.exists()) {
        const orderData = orderDoc.data()
        const existingPaymentInfo = orderData.paymentInfo || []

        // 환불 정보를 paymentInfo 배열에 추가 (undefined 값 제외)
        const cancelInfo: Record<string, any> = {
          paymentId: paymentId,
          paidAt: new Date(cancelledAt),
          cancelledAt: new Date(cancelledAt),
          status: 'cancelled',
          method: 'refund'
        }

        // amount가 유효한 경우에만 추가
        if (cancelledAmount !== undefined && cancelledAmount !== null && cancelledAmount > 0) {
          cancelInfo.amount = cancelledAmount
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
          cancelledAmount: cancelledAmount || '금액 정보 없음'
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
