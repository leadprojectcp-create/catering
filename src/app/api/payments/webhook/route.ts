import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import * as PortOne from '@portone/server-sdk'
import { sendKakaoAlimtalk } from '@/lib/services/smsService'
import { requestQuickDelivery, createQuickDeliveryData } from '@/lib/services/quickDeliveryService'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 웹훅 검증을 위해 raw body 읽기
    const rawBody = await request.text()

    // 웹훅 메시지 검증 (Standard Webhooks 스펙)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let webhook: any = null
    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('[Webhook] No webhook secret configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    try {
      webhook = await PortOne.Webhook.verify(
        webhookSecret,
        rawBody,
        Object.fromEntries(request.headers.entries())
      )
    } catch (e) {
      if (e instanceof PortOne.Webhook.WebhookVerificationError) {
        console.error('[Webhook] Verification failed:', e.message)
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      throw e
    }

    const { type, data } = webhook

    console.log('PortOne Webhook received:', { type, data })

    // 결제 완료 이벤트 처리
    if (type === 'Transaction.Paid') {
      const { paymentId, transactionId } = data

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
        paymentId: paymentId,
      })

      // 결제 상태가 PAID인지 확인
      if (paymentData.status !== 'PAID') {
        console.error('[Webhook] Payment status is not PAID:', paymentData.status)
        return NextResponse.json(
          { error: 'Invalid payment status' },
          { status: 400 }
        )
      }

      // paymentId 형식: payment-{orderId}-{timestamp}
      // orderId 추출 (예: payment-xx5LScOWPjlq8PUvxXJt-1761071072457 -> xx5LScOWPjlq8PUvxXJt)
      const orderId = paymentId.replace(/^payment-/, '').replace(/-\d+$/, '')

      console.log('[Webhook] PaymentId:', paymentId)
      console.log('[Webhook] Extracted orderId:', orderId)

      // Firestore에서 주문 업데이트
      if (orderId) {
        const orderRef = doc(db, 'orders', orderId)

        // paymentData에서 필요한 필드만 저장 (민감한 정보 제외, undefined 제외)
        const paymentInfo: Record<string, string | number | object> = {}

        if (paymentData.method) paymentInfo.method = paymentData.method
        if (paymentData.amount) paymentInfo.amount = paymentData.amount
        if (paymentData.currency) paymentInfo.currency = paymentData.currency
        if (paymentData.paidAt) paymentInfo.paidAt = paymentData.paidAt
        if (paymentData.pgProvider) paymentInfo.pgProvider = paymentData.pgProvider
        if (paymentData.pgTxId) paymentInfo.pgTxId = paymentData.pgTxId
        if (paymentData.receiptUrl) paymentInfo.receiptUrl = paymentData.receiptUrl
        if (paymentData.status) paymentInfo.status = paymentData.status

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
                // 이미 알림톡을 발송했는지 확인
                const alreadyNotified = orderData.partnerNotified === true

                if (!alreadyNotified) {
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

                  try {
                    // 카카오톡 알림톡 발송 (템플릿 코드: UD_0958)
                    // Aligo에서 알림톡 실패 시 자동으로 SMS 대체 발송
                    const kakaoSuccess = await sendKakaoAlimtalk(partnerPhone, 'UD_0958', alimtalkParams)

                    if (kakaoSuccess) {
                      console.log(`[Webhook] 알림톡/SMS 발송 요청 성공: ${partnerPhone}`)
                      // 알림톡 발송 완료 표시
                      await updateDoc(orderRef, {
                        partnerNotified: true,
                        partnerNotifiedAt: new Date(),
                      })
                    } else {
                      console.error('[Webhook] 알림톡/SMS 발송 요청 실패:', partnerPhone)
                    }
                  } catch (alimtalkError) {
                    console.error('[Webhook] 알림톡 발송 중 에러:', alimtalkError)
                    // 알림톡 에러가 발생해도 웹훅은 계속 진행
                  }
                } else {
                  console.log(`[Webhook] 이미 알림톡을 발송한 주문입니다: ${orderId}`)
                }

                // 퀵업체 배송인 경우 퀵 배송 요청
                if (orderData?.deliveryMethod === '퀵업체 배송') {
                  console.log('[Webhook] 퀵 배송 요청 시작...')
                  try {
                    const quickDeliveryData = createQuickDeliveryData(orderData, storeData)
                    const quickResult = await requestQuickDelivery(quickDeliveryData)

                    if (quickResult && quickResult.code === '1') {
                      console.log('[Webhook] 퀵 배송 요청 성공:', quickResult)

                      // quickDeliveries 컬렉션에 저장
                      const quickDeliveryRef = doc(db, 'quickDeliveries', orderId)
                      await setDoc(quickDeliveryRef, {
                        orderId: orderId,
                        orderNo: quickResult.orderNo,
                        status: 'requested',
                        feeTotal: quickResult.orderInfo?.feeTotal || 0,
                        feeDetail: quickResult.orderInfo?.feeDetail || '',
                        requestData: quickDeliveryData,
                        responseData: quickResult,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      })

                      // orders 컬렉션에도 퀵 배송 정보 저장
                      await updateDoc(orderRef, {
                        quickDeliveryOrderNo: quickResult.orderNo,
                        quickDeliveryStatus: 'requested',
                      })
                    } else {
                      console.error('[Webhook] 퀵 배송 요청 실패:', quickResult)

                      // 실패 정보도 quickDeliveries 컬렉션에 저장
                      const quickDeliveryRef = doc(db, 'quickDeliveries', orderId)
                      await setDoc(quickDeliveryRef, {
                        orderId: orderId,
                        status: 'failed',
                        errorCode: quickResult?.code || 'unknown',
                        errorMessage: quickResult?.message || 'Unknown error',
                        requestData: quickDeliveryData,
                        responseData: quickResult,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      })

                      await updateDoc(orderRef, {
                        quickDeliveryStatus: 'failed',
                        quickDeliveryError: quickResult?.message || 'Unknown error',
                      })
                    }
                  } catch (error) {
                    console.error('[Webhook] 퀵 배송 요청 에러:', error)

                    // 에러 정보도 quickDeliveries 컬렉션에 저장
                    const quickDeliveryRef = doc(db, 'quickDeliveries', orderId)
                    await setDoc(quickDeliveryRef, {
                      orderId: orderId,
                      status: 'error',
                      errorMessage: error instanceof Error ? error.message : 'Unknown error',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    })

                    await updateDoc(orderRef, {
                      quickDeliveryStatus: 'error',
                      quickDeliveryError: error instanceof Error ? error.message : 'Unknown error',
                    })
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
      const { paymentId } = data
      // paymentId에서 orderId 추출
      const orderId = paymentId.replace(/^payment-/, '').replace(/-\d+$/, '')

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
      const { paymentId } = data
      // paymentId에서 orderId 추출
      const orderId = paymentId.replace(/^payment-/, '').replace(/-\d+$/, '')

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
