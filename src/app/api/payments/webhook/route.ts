import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import crypto from 'crypto'
import { sendKakaoAlimtalk } from '@/lib/services/smsService'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('webhook-signature')
    const rawBody = await request.text()
    const isDevelopment = process.env.NODE_ENV === 'development'

    // 임시로 시그니처 검증 비활성화 (디버깅용)
    console.log('[Webhook] Signature verification temporarily disabled for debugging')
    console.log('[Webhook] Received signature:', signature)

    // TODO: 나중에 시그니처 검증 다시 활성화
    // if (!isDevelopment) {
    //   if (!signature) {
    //     console.error('No webhook signature provided')
    //     return NextResponse.json(
    //       { error: 'Unauthorized' },
    //       { status: 401 }
    //     )
    //   }
    //
    //   // Try both webhook secrets
    //   const secret1 = process.env.PORTONE_WEBHOOK_SECRET_1
    //   const secret2 = process.env.PORTONE_WEBHOOK_SECRET_2
    //
    //   const expectedSignature1 = secret1
    //     ? crypto.createHmac('sha256', secret1).update(rawBody).digest('base64')
    //     : null
    //   const expectedSignature2 = secret2
    //     ? crypto.createHmac('sha256', secret2).update(rawBody).digest('base64')
    //     : null
    //
    //   const isValidSignature =
    //     signature === expectedSignature1 ||
    //     signature === expectedSignature2
    //
    //   if (!isValidSignature) {
    //     console.error('Invalid webhook signature')
    //     return NextResponse.json(
    //       { error: 'Unauthorized' },
    //       { status: 401 }
    //     )
    //   }
    // }

    const body = JSON.parse(rawBody)
    const { type, data } = body

    console.log('PortOne Webhook received:', { type, data })

    // 결제 완료 이벤트 처리
    if (type === 'Transaction.Paid') {
      const { paymentId, transactionId, orderId: webhookOrderId } = data

      // 포트원 API로 결제 검증
      const verifyResponse = await fetch(
        `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: {
            Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
          },
        }
      )

      if (!verifyResponse.ok) {
        console.error('[Webhook] Payment verification failed')
        return NextResponse.json(
          { error: 'Payment verification failed' },
          { status: 400 }
        )
      }

      const paymentData = await verifyResponse.json()

      console.log('[Webhook] Payment data:', {
        status: paymentData.status,
        orderId: paymentData.orderId,
        webhookOrderId,
      })

      // 결제 상태가 PAID인지 확인
      if (paymentData.status !== 'PAID') {
        console.error('[Webhook] Payment status is not PAID:', paymentData.status)
        return NextResponse.json(
          { error: 'Invalid payment status' },
          { status: 400 }
        )
      }

      // orderId 가져오기: webhook data > payment data > paymentId에서 추출
      const orderId = webhookOrderId || paymentData.orderId || paymentId.split('-')[1]

      console.log('[Webhook] Using orderId:', orderId)

      // Firestore에서 주문 업데이트
      if (orderId) {
        const orderRef = doc(db, 'orders', orderId)

        // paymentData에서 필요한 필드만 저장
        const paymentInfo = {
          method: paymentData.method,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paidAt: paymentData.paidAt,
          pgProvider: paymentData.pgProvider,
          pgTxId: paymentData.pgTxId,
        }

        await updateDoc(orderRef, {
          paymentStatus: 'paid',
          paymentId: paymentId,
          transactionId: transactionId,
          paidAt: new Date(),
          paymentInfo: paymentInfo,
        })

        console.log(`[Webhook] Order ${orderId} updated with payment info`)

        // 주문 정보 조회
        const orderDoc = await getDoc(orderRef)
        if (orderDoc.exists()) {
          const orderData = orderDoc.data()
          const storeId = orderData?.storeId

          console.log(`[Webhook] Order data:`, {
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

              console.log(`[Webhook] Store data:`, {
                storeId,
                partnerPhone,
                storeName: storeData?.storeName,
              })

              if (partnerPhone) {
                // 총 수량 계산
                console.log(`[Webhook] Order items:`, orderData.items)
                const totalQuantity = orderData.items?.reduce(
                  (sum: number, item: { quantity: number }) => sum + item.quantity,
                  0
                ) || 0

                console.log(`[Webhook] Calculated totalQuantity:`, totalQuantity)

                const alimtalkParams = {
                  storeName: orderData.storeName || '',
                  orderNumber: orderData.orderNumber || orderId,
                  totalQuantity: String(totalQuantity),
                  totalProductPrice: String(orderData.totalProductPrice || orderData.totalPrice || 0),
                }

                console.log(`[Webhook] Alimtalk params:`, alimtalkParams)
                console.log(`[Webhook] Sending Kakao Alimtalk to ${partnerPhone}`)

                // 카카오톡 알림톡 발송 (템플릿 코드: UD_0958)
                const kakaoSuccess = await sendKakaoAlimtalk(partnerPhone, 'UD_0958', alimtalkParams)

                if (kakaoSuccess) {
                  console.log(`[Webhook] 카카오톡 알림 발송 성공: ${partnerPhone}`)
                } else {
                  console.warn('[Webhook] 카카오톡 알림 발송 실패, SMS로 폴백 시도')
                  // 카카오톡 발송 실패 시 SMS로 폴백
                  try {
                    const { sendSMS } = await import('@/lib/services/smsService')
                    const smsMessage = `[단모] 신규주문이 들어왔습니다.\n\n가게명: ${orderData.storeName || ''}\n주문번호: ${orderData.orderNumber || orderId}\n총 수량: ${totalQuantity}개\n상품금액: ${orderData.totalProductPrice || orderData.totalPrice || 0}원\n\n주문확인: https://danchemoim.com/partner/order/history/`

                    await sendSMS(partnerPhone, smsMessage)
                    console.log(`[Webhook] SMS 알림 발송 성공 (폴백): ${partnerPhone}`)
                  } catch (smsError) {
                    console.error('[Webhook] SMS 알림 발송 실패:', smsError)
                    // SMS도 실패해도 주문 처리는 계속 진행
                  }
                }
              } else {
                console.warn(`Store ${storeId} has no businessPhone`)
              }
            } else {
              console.warn(`Store ${storeId} not found`)
            }
          }
        }
      }

      return NextResponse.json({ success: true })
    }

    // 결제 취소 이벤트 처리
    if (type === 'Transaction.Cancelled') {
      const { paymentId, orderId } = data

      if (orderId) {
        const orderRef = doc(db, 'orders', orderId)
        await updateDoc(orderRef, {
          paymentStatus: 'cancelled',
          cancelledAt: new Date(),
        })

        console.log(`Order ${orderId} cancelled`)
      }

      return NextResponse.json({ success: true })
    }

    // 결제 실패 이벤트 처리
    if (type === 'Transaction.Failed') {
      const { paymentId, orderId } = data

      if (orderId) {
        const orderRef = doc(db, 'orders', orderId)
        await updateDoc(orderRef, {
          paymentStatus: 'failed',
          failedAt: new Date(),
        })

        console.log(`Order ${orderId} payment failed`)
      }

      return NextResponse.json({ success: true })
    }

    // 처리하지 않는 이벤트 타입
    console.log('Unhandled webhook type:', type)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
