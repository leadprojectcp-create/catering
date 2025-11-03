import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import * as PortOne from '@portone/server-sdk'
import { sendKakaoAlimtalk } from '@/lib/services/smsService'
import { requestQuickDelivery } from '@/lib/services/quickDeliveryService'

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
      console.log('[Webhook] Transaction.Paid 이벤트 수신!')
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
      console.log('[Webhook] 결제 정보는 프론트엔드에서 저장됩니다. 웹훅은 알림톡/퀵배송만 처리합니다.')

      // Firestore에서 주문 정보 조회 (알림톡/퀵배송 처리용)
      if (orderId) {
        const orderRef = doc(db, 'orders', orderId)

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
                // 추가 주문 여부 확인 (paymentInfo 배열 길이로 판단)
                const isAdditionalOrder = orderData.paymentInfo && Array.isArray(orderData.paymentInfo) && orderData.paymentInfo.length > 1

                // 이미 알림톡을 발송했는지 확인
                const alreadyNotified = orderData.partnerNotified === true

                // 최초 주문이거나 추가 주문인 경우 알림톡 발송
                if (!alreadyNotified || isAdditionalOrder) {
                  // 총 수량 계산 (DB의 totalQuantity 우선 사용)
                  console.log(`[Webhook] Order items:`, orderData.items)
                  const totalQuantity = orderData.totalQuantity || orderData.items?.reduce(
                    (sum: number, item: { quantity: number }) => sum + item.quantity,
                    0
                  ) || 0
                  const totalProductPrice = orderData.totalProductPrice || orderData.totalPrice || 0

                  console.log(`[Webhook] Calculated totalQuantity:`, totalQuantity)
                  console.log(`[Webhook] Is additional order:`, isAdditionalOrder)

                  // 추가 주문인 경우 isAddItem이 true인 모든 아이템들의 수량과 금액 계산
                  let additionalQuantity = 0
                  let additionalProductPrice = 0

                  if (isAdditionalOrder && orderData.items) {
                    const additionalItems = orderData.items.filter(
                      (item: { isAddItem?: boolean }) => item.isAddItem === true
                    )

                    additionalQuantity = additionalItems.reduce(
                      (sum: number, item: { quantity: number }) => sum + item.quantity,
                      0
                    )

                    additionalProductPrice = additionalItems.reduce(
                      (sum: number, item: { itemPrice?: number }) => sum + (item.itemPrice || 0),
                      0
                    )

                    console.log(`[Webhook] Additional order details:`, {
                      additionalQuantity,
                      additionalProductPrice,
                      additionalItems: additionalItems.length
                    })
                  }

                  const alimtalkParams = {
                    storeName: orderData.storeName || '',
                    orderNumber: orderData.orderNumber || orderId,
                    totalQuantity: String(totalQuantity),
                    totalProductPrice: String(totalProductPrice),
                    additionalQuantity: String(additionalQuantity),
                    additionalProductPrice: String(additionalProductPrice),
                  }

                  console.log(`[Webhook] Alimtalk params:`, alimtalkParams)

                  // 템플릿 코드 선택
                  // 파트너용: 신규 UD_0958, 추가 UD_3133
                  // 고객용: 신규 UD_3134, 추가 UD_3135
                  const partnerTemplateCode = isAdditionalOrder ? 'UD_3133' : 'UD_0958'
                  const customerTemplateCode = isAdditionalOrder ? 'UD_3135' : 'UD_3134'
                  console.log(`[Webhook] Partner template: ${partnerTemplateCode}, Customer template: ${customerTemplateCode}`)

                  try {
                    // 1. 파트너에게 알림톡 발송
                    console.log(`[Webhook] Sending Kakao Alimtalk to partner: ${partnerPhone}`)
                    const partnerKakaoSuccess = await sendKakaoAlimtalk(partnerPhone, partnerTemplateCode, alimtalkParams)

                    if (partnerKakaoSuccess) {
                      console.log(`[Webhook] 파트너 알림톡/SMS 발송 요청 성공: ${partnerPhone}`)
                      // 최초 주문인 경우에만 partnerNotified 업데이트
                      if (!alreadyNotified) {
                        await updateDoc(orderRef, {
                          partnerNotified: true,
                          partnerNotifiedAt: new Date(),
                        })
                      }
                    } else {
                      console.error('[Webhook] 파트너 알림톡/SMS 발송 요청 실패:', partnerPhone)
                    }

                    // 2. 주문자에게 알림톡 발송
                    const userId = orderData?.uid
                    if (userId) {
                      console.log(`[Webhook] Looking up user: ${userId}`)
                      const userRef = doc(db, 'users', userId)
                      const userDoc = await getDoc(userRef)

                      if (userDoc.exists()) {
                        const userData = userDoc.data()
                        const customerPhone = userData?.phone

                        if (customerPhone) {
                          console.log(`[Webhook] Sending Kakao Alimtalk to customer: ${customerPhone}`)
                          // 고객용 템플릿 사용
                          const customerKakaoSuccess = await sendKakaoAlimtalk(customerPhone, customerTemplateCode, alimtalkParams)

                          if (customerKakaoSuccess) {
                            console.log(`[Webhook] 고객 알림톡/SMS 발송 요청 성공: ${customerPhone}`)
                          } else {
                            console.error('[Webhook] 고객 알림톡/SMS 발송 요청 실패:', customerPhone)
                          }
                        } else {
                          console.warn(`[Webhook] User ${userId} has no phone number`)
                        }
                      } else {
                        console.warn(`[Webhook] User ${userId} not found`)
                      }
                    } else {
                      console.warn(`[Webhook] Order has no uid field`)
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
                    // 퀵 배송 데이터 생성
                    const deliveryInfo = orderData?.deliveryInfo || {}
                    const startAddress = storeData?.address
                      ? `${storeData.address.city || ''} ${storeData.address.district || ''} ${storeData.address.dong || ''}`.trim()
                      : ''

                    const reservDatetimeUp = deliveryInfo.deliveryDate && deliveryInfo.deliveryTime
                      ? `${deliveryInfo.deliveryDate} ${deliveryInfo.deliveryTime}:00`
                      : undefined

                    const quickDeliveryData = {
                      serviceType: 'damas',
                      startCName: storeData?.storeName || '',
                      startManager: storeData?.storeName || '',
                      startPhone: storeData?.phone || '',
                      startAddress: startAddress,
                      startAddressDetail: storeData?.address?.detail || '',
                      destCName: deliveryInfo.addressName || '',
                      destManager: deliveryInfo.recipient || '',
                      destPhone: deliveryInfo.recipientPhone || '',
                      destAddress: deliveryInfo.address || '',
                      destAddressDetail: deliveryInfo.detailAddress || '',
                      runtype: 0,
                      payType: 'contract',
                      reservDatetimeUp,
                      hddMemo: deliveryInfo.detailedRequest || '',
                      upWay: 'free_customer',
                      downWay: 'free_customer',
                      deliveryItem: {
                        bgBox: 1
                      }
                    }

                    // 퀵 배송 서비스 직접 호출 (내부 API 대신)
                    const quickResult = await requestQuickDelivery(quickDeliveryData)
                    console.log('[Webhook] 퀵 배송 API 응답:', quickResult)

                    // code가 1 또는 '1'이면 성공
                    const isSuccess = quickResult.code === 1 || quickResult.code === '1'

                    if (isSuccess) {
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
                        quickDeliveryInfo: {
                          code: quickResult.code,
                          orderNo: quickResult.orderNo,
                          orderInfo: quickResult.orderInfo || {},
                          createdAt: new Date(),
                        }
                      })
                    } else {
                      const errorMsg = quickResult?.errMsg || quickResult?.message || quickResult?.error || JSON.stringify(quickResult)
                      console.error('[Webhook] 퀵 배송 요청 실패:', {
                        code: quickResult?.code,
                        error: errorMsg
                      })

                      // 실패 정보도 quickDeliveries 컬렉션에 저장
                      const quickDeliveryRef = doc(db, 'quickDeliveries', orderId)
                      await setDoc(quickDeliveryRef, {
                        orderId: orderId,
                        status: 'failed',
                        errorCode: quickResult?.code || 'unknown',
                        errorMessage: errorMsg,
                        requestData: quickDeliveryData,
                        responseData: quickResult,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      })

                      await updateDoc(orderRef, {
                        quickDeliveryStatus: 'failed',
                        quickDeliveryError: errorMsg,
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

      console.log('[Webhook] Transaction.Cancelled 이벤트 수신:', { paymentId, orderId })

      if (orderId) {
        const orderRef = doc(db, 'orders', orderId)
        const orderDoc = await getDoc(orderRef)

        if (orderDoc.exists()) {
          const orderData = orderDoc.data()
          const paymentInfo = orderData.paymentInfo || []

          console.log('[Webhook] Current paymentInfo:', paymentInfo)

          // paymentInfo 배열에서 해당 paymentId 찾아서 업데이트
          const updatedPaymentInfo = paymentInfo.map((payment: { paymentId: string }) => {
            if (payment.paymentId === paymentId) {
              console.log('[Webhook] Found matching payment, marking as cancelled:', payment.paymentId)
              return {
                ...payment,
                status: 'cancelled',
                cancelledAt: new Date(),
              }
            }
            return payment
          })

          // 모든 결제가 취소되었는지 확인
          const allPaymentsCancelled = updatedPaymentInfo.every((payment: any) =>
            payment.status === 'cancelled'
          )

          // paymentInfo가 하나만 있고 취소된 경우 (최초 주문 취소)
          const isSinglePayment = paymentInfo.length === 1
          const isMainPaymentCancelled = updatedPaymentInfo.length > 0 && updatedPaymentInfo[0].status === 'cancelled'

          if (isSinglePayment && isMainPaymentCancelled) {
            // 전체 주문 취소
            await updateDoc(orderRef, {
              paymentStatus: 'cancelled',
              orderStatus: 'cancelled',
              paymentInfo: updatedPaymentInfo,
              cancelledAt: new Date(),
            })
            console.log(`[Webhook] Main order ${orderId} cancelled completely`)
          } else {
            // 추가 주문 취소 또는 부분 취소
            await updateDoc(orderRef, {
              orderStatus: allPaymentsCancelled ? 'cancelled' : 'partial_cancelled',
              paymentInfo: updatedPaymentInfo,
            })
            console.log(`[Webhook] Additional order payment ${paymentId} cancelled for order ${orderId}`)
          }
        } else {
          console.warn(`[Webhook] Order ${orderId} not found`)
        }
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
