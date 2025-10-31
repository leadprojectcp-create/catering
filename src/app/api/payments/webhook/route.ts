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

        // 기존 주문 데이터 조회 (paymentInfo 배열 확인)
        const orderSnapshot = await getDoc(orderRef)
        const existingOrderData = orderSnapshot.data()

        console.log('[Webhook] 기존 주문 데이터 조회:', {
          orderId,
          orderExists: orderSnapshot.exists(),
          hasPaymentInfo: !!existingOrderData?.paymentInfo,
          paymentInfoType: existingOrderData?.paymentInfo ?
            (Array.isArray(existingOrderData.paymentInfo) ? 'array' : 'object') :
            'none'
        })

        // paymentData에서 PortOne 전체 응답을 저장
        const newPaymentInfo = {
          ...paymentData, // PortOne API 전체 응답
          paidAt: new Date()
        }

        console.log('[Webhook] PortOne 전체 응답 구조:', {
          id: paymentData.id,
          status: paymentData.status,
          hasAmount: !!paymentData.amount,
          hasMethod: !!paymentData.method,
          keys: Object.keys(paymentData)
        })

        // 기존 paymentInfo 배열 가져오기
        let paymentInfoArray = []
        if (existingOrderData?.paymentInfo) {
          if (Array.isArray(existingOrderData.paymentInfo)) {
            // 이미 배열인 경우
            paymentInfoArray = existingOrderData.paymentInfo
          } else {
            // 단일 객체인 경우 배열로 변환
            paymentInfoArray = [existingOrderData.paymentInfo]
          }
        }

        // paymentId로 이미 존재하는 항목 찾기 (중복 방지)
        const existingIndex = paymentInfoArray.findIndex(
          (info: { id?: string }) => info.id === paymentData.id
        )

        if (existingIndex >= 0) {
          // 이미 존재하면 업데이트
          paymentInfoArray[existingIndex] = newPaymentInfo
          console.log(`[Webhook] paymentInfo 배열 항목 업데이트 (index: ${existingIndex})`)
        } else {
          // 없으면 추가
          paymentInfoArray.push(newPaymentInfo)
          console.log(`[Webhook] paymentInfo 배열에 새 항목 추가 (total: ${paymentInfoArray.length})`)
        }

        // 기존 paymentId 배열 처리 (하위 호환성)
        let paymentIdArray = []
        if (existingOrderData?.paymentId) {
          paymentIdArray = Array.isArray(existingOrderData.paymentId)
            ? existingOrderData.paymentId
            : [existingOrderData.paymentId]
        }
        if (!paymentIdArray.includes(paymentId)) {
          paymentIdArray.push(paymentId)
        }

        // 기존 paidAt 배열 처리
        let paidAtArray = []
        if (existingOrderData?.paidAt) {
          paidAtArray = Array.isArray(existingOrderData.paidAt)
            ? existingOrderData.paidAt
            : [existingOrderData.paidAt]
        }
        paidAtArray.push(new Date())

        // pendingItems가 있으면 items에 추가 (추가 결제 완료 시)
        let finalItems = existingOrderData?.items || []
        const hasPendingItems = existingOrderData?.pendingItems && existingOrderData.pendingItems.length > 0

        if (hasPendingItems) {
          console.log('[Webhook] pendingItems 감지 - items에 추가:', existingOrderData.pendingItems)
          finalItems = [...finalItems, ...existingOrderData.pendingItems]

          // totalProductPrice와 totalQuantity도 업데이트
          const newTotalProductPrice = (existingOrderData?.totalProductPrice || 0) + (existingOrderData?.pendingTotalProductPrice || 0)
          const newTotalQuantity = (existingOrderData?.totalQuantity || 0) + (existingOrderData?.pendingTotalQuantity || 0)

          console.log('[Webhook] 총 금액/수량 업데이트:', {
            기존금액: existingOrderData?.totalProductPrice,
            추가금액: existingOrderData?.pendingTotalProductPrice,
            최종금액: newTotalProductPrice,
            기존수량: existingOrderData?.totalQuantity,
            추가수량: existingOrderData?.pendingTotalQuantity,
            최종수량: newTotalQuantity
          })
        }

        console.log('[Webhook] Firestore 업데이트 준비:', {
          orderId,
          paymentStatus: 'paid',
          paymentIdArrayLength: paymentIdArray.length,
          paidAtArrayLength: paidAtArray.length,
          paymentInfoArrayLength: paymentInfoArray.length,
          hasPendingItems,
          finalItemsLength: finalItems.length,
          paymentInfoFirstItem: paymentInfoArray[0] ? {
            id: paymentInfoArray[0].id,
            status: paymentInfoArray[0].status,
            hasAmount: !!paymentInfoArray[0].amount
          } : null
        })

        const updateData: Record<string, unknown> = {
          paymentStatus: 'paid',
          paymentId: paymentIdArray,
          transactionId: transactionId,
          paidAt: paidAtArray,
          paymentInfo: paymentInfoArray,
        }

        // paymentInfo가 배열인지 명시적으로 확인
        console.log('[Webhook] paymentInfo 타입 확인:', {
          isArray: Array.isArray(paymentInfoArray),
          length: paymentInfoArray.length,
          type: typeof paymentInfoArray,
          firstElement: paymentInfoArray[0] ? typeof paymentInfoArray[0] : 'empty'
        })

        // pendingItems가 있었다면 items 업데이트 및 pending 필드 삭제
        if (hasPendingItems) {
          updateData.items = finalItems
          updateData.totalProductPrice = (existingOrderData?.totalProductPrice || 0) + (existingOrderData?.pendingTotalProductPrice || 0)
          updateData.totalQuantity = (existingOrderData?.totalQuantity || 0) + (existingOrderData?.pendingTotalQuantity || 0)
          updateData.pendingItems = null
          updateData.pendingTotalProductPrice = null
          updateData.pendingTotalQuantity = null
        }

        await updateDoc(orderRef, updateData)

        console.log(`[Webhook] ✅ Order ${orderId} updated with payment info (배열 길이: ${paymentInfoArray.length})`)

        // 업데이트 후 확인
        const updatedOrderSnapshot = await getDoc(orderRef)
        const updatedOrderData = updatedOrderSnapshot.data()
        console.log('[Webhook] 업데이트 후 확인:', {
          orderId,
          hasPaymentInfo: !!updatedOrderData?.paymentInfo,
          paymentInfoLength: Array.isArray(updatedOrderData?.paymentInfo) ?
            updatedOrderData.paymentInfo.length : 'not array',
          paymentStatus: updatedOrderData?.paymentStatus
        })

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
