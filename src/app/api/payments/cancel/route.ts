import { NextRequest, NextResponse } from 'next/server'
import * as PortOne from '@portone/server-sdk'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore'
import { sendCancellationNotification } from '@/lib/services/smsService'

// PortOne V2 SDK로 결제 취소
export async function POST(request: NextRequest) {
  try {
    const { paymentId, orderId, reason, refundAmount, isPartnerCancel, isPartialCancel } = await request.json()

    // paymentId와 orderId 중 하나는 필수
    if (!paymentId && !orderId) {
      return NextResponse.json(
        { error: 'paymentId or orderId is required' },
        { status: 400 }
      )
    }

    // 포인트 전용 결제인지 확인 (paymentId가 없는 경우)
    const isPointOnlyPayment = !paymentId || paymentId === '' || paymentId === 'point-only'

    let cancelResponse = null

    // 실제 결제가 있는 경우에만 PortOne API 호출
    if (!isPointOnlyPayment) {
      const apiSecret = process.env.PORTONE_API_KEY
      if (!apiSecret) {
        console.error('PORTONE_API_KEY is not set')
        return NextResponse.json(
          { success: false, error: 'API key not configured' },
          { status: 500 }
        )
      }

      // PortOne V2 클라이언트 생성
      const client = PortOne.PortOneClient({
        secret: apiSecret,
      })

      // 결제 취소 요청
      cancelResponse = await client.payment.cancelPayment({
        paymentId: paymentId,
        reason: reason || '고객 요청에 의한 취소',
        amount: refundAmount, // 부분 취소 금액 (전체 취소는 undefined)
      })

      console.log('[Cancel API] PortOne V2 결제 취소 완료:', {
        paymentId: paymentId,
        cancelledAmount: refundAmount,
        status: 'cancelled'
      })
    } else {
      console.log('[Cancel API] 포인트 전용 결제 - PortOne API 호출 생략:', {
        orderId: orderId
      })
    }

    // 결제 취소 성공 후 바로 DB 업데이트
    try {
      let orderDoc
      let foundOrderId
      let orderData

      if (orderId) {
        // orderId로 직접 검색 (포인트 전용 결제)
        const orderDocRef = doc(db, 'orders', orderId)
        const orderSnapshot = await getDoc(orderDocRef)

        if (orderSnapshot.exists()) {
          orderDoc = orderSnapshot
          foundOrderId = orderId
          orderData = orderSnapshot.data()
        }
      } else {
        // paymentId로 주문 검색 (일반 결제)
        const ordersRef = collection(db, 'orders')
        const q = query(ordersRef, where('paymentId', 'array-contains', paymentId))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          orderDoc = querySnapshot.docs[0]
          foundOrderId = orderDoc.id
          orderData = orderDoc.data()
        }
      }

      if (orderDoc && foundOrderId && orderData) {
        const existingPaymentInfo = orderData.paymentInfo || []
        const currentOrderStatus = orderData.orderStatus

        console.log('[Cancel API] 주문 찾음:', foundOrderId, '현재 상태:', currentOrderStatus)

        // paymentInfo에서 해당 paymentId 찾아서 status를 'cancelled'로 변경
        // 포인트 전용 결제는 paymentInfo가 없거나 비어있을 수 있음
        const updatedPaymentInfo = existingPaymentInfo.map((info: { id: string; status: string; cancelledAt?: Date }) => {
          if (paymentId && info.id === paymentId) {
            console.log('[Cancel API] paymentInfo 업데이트:', info.id)
            return {
              ...info,
              status: 'cancelled',
              cancelledAt: new Date()
            }
          }
          return info
        })

        // DB 업데이트
        const orderRef = doc(db, 'orders', foundOrderId)

        if (isPartialCancel) {
          // 부분 취소 (추가주문 취소 등): orderStatus 변경 없이 paymentInfo, items, paymentId 업데이트
          console.log('[Cancel API] 부분 취소 - orderStatus 유지:', currentOrderStatus)

          // items 배열에서 해당 paymentId를 가진 아이템 제거
          const existingItems = orderData.items || []
          console.log('[Cancel API] items 필터링 전:', {
            paymentId: paymentId,
            isPointOnlyPayment: isPointOnlyPayment,
            totalItems: existingItems.length,
            itemsWithPaymentId: existingItems.map((item: any) => ({
              productName: item.productName,
              paymentId: item.paymentId,
              isAddItem: item.isAddItem
            }))
          })

          let updatedItems
          if (paymentId && paymentId !== '' && paymentId !== 'point-only') {
            // paymentId가 있으면 일치하는 항목 제거
            updatedItems = existingItems.filter((item: { paymentId?: string }) => item.paymentId !== paymentId)
          } else {
            // paymentId가 없으면 (포인트 전용) 추가주문 중 빈 paymentId를 가진 것들 찾아서 제거
            const additionalItemsWithEmptyPayment = existingItems.filter((it: any) =>
              it.isAddItem && (!it.paymentId || it.paymentId === '' || it.paymentId === 'point-only')
            )
            console.log('[Cancel API] 삭제할 추가주문 아이템:', additionalItemsWithEmptyPayment.length, '개')

            // 첫 번째로 발견된 빈 paymentId 추가주문 아이템들 제거
            if (additionalItemsWithEmptyPayment.length > 0) {
              updatedItems = existingItems.filter((item: any) => !additionalItemsWithEmptyPayment.includes(item))
            } else {
              updatedItems = existingItems
            }
          }

          console.log('[Cancel API] items 배열 업데이트:', orderData.items?.length, '->', updatedItems.length)

          // paymentInfo 배열에서 해당 paymentId를 가진 결제 정보 제거
          const filteredPaymentInfo = updatedPaymentInfo.filter((info: { id: string }) => info.id !== paymentId)
          console.log('[Cancel API] paymentInfo 배열 업데이트:', updatedPaymentInfo.length, '->', filteredPaymentInfo.length)

          // paymentId 배열에서 해당 paymentId 제거
          const existingPaymentIds = orderData.paymentId || []
          const updatedPaymentIds = Array.isArray(existingPaymentIds)
            ? existingPaymentIds.filter((id: string) => id !== paymentId)
            : existingPaymentIds === paymentId ? [] : [existingPaymentIds]
          console.log('[Cancel API] paymentId 배열 업데이트:', Array.isArray(existingPaymentIds) ? existingPaymentIds.length : 1, '->', updatedPaymentIds.length)

          // orderDates 배열에서 해당 paymentId를 가진 항목 제거
          const existingOrderDates = orderData.orderDates || []
          let updatedOrderDates

          if (paymentId && paymentId !== '' && paymentId !== 'point-only') {
            // paymentId가 있으면 일치하는 항목 제거
            updatedOrderDates = existingOrderDates.filter((od: { paymentId?: string }) => od.paymentId !== paymentId)
          } else {
            // paymentId가 없거나 'point-only'면 추가주문 중 빈 paymentId를 가진 첫 번째 항목 제거
            const additionalWithEmptyPayment = existingOrderDates.filter((item: any) =>
              item.type === 'additional' && (!item.paymentId || item.paymentId === '' || item.paymentId === 'point-only')
            )
            console.log('[Cancel API] 삭제할 추가주문 orderDates:', additionalWithEmptyPayment.length, '개')

            if (additionalWithEmptyPayment.length > 0) {
              updatedOrderDates = existingOrderDates.filter((item: any) => !additionalWithEmptyPayment.includes(item))
            } else {
              updatedOrderDates = existingOrderDates
            }
          }

          console.log('[Cancel API] orderDates 배열 업데이트:', Array.isArray(existingOrderDates) ? existingOrderDates.length : 0, '->', updatedOrderDates.length)

          // totalProductPrice 재계산
          const newTotalProductPrice = updatedItems.reduce((sum: number, item: { itemPrice?: number; price: number; quantity: number }) => {
            return sum + (item.itemPrice || (item.price * item.quantity))
          }, 0)

          // totalQuantity 재계산
          const newTotalQuantity = updatedItems.reduce((sum: number, item: { quantity: number }) => {
            return sum + item.quantity
          }, 0)

          // totalPrice 재계산 (totalProductPrice + deliveryFee)
          const currentDeliveryFee = orderData.deliveryFee || 0
          const newTotalPrice = newTotalProductPrice + currentDeliveryFee

          console.log('[Cancel API] 가격/수량 재계산:', {
            이전TotalProductPrice: orderData.totalProductPrice,
            새TotalProductPrice: newTotalProductPrice,
            이전TotalQuantity: orderData.totalQuantity,
            새TotalQuantity: newTotalQuantity,
            배송비: currentDeliveryFee,
            새TotalPrice: newTotalPrice
          })

          await updateDoc(orderRef, {
            items: updatedItems,
            paymentInfo: filteredPaymentInfo,
            paymentId: updatedPaymentIds,
            orderDates: updatedOrderDates,
            totalProductPrice: newTotalProductPrice,
            totalQuantity: newTotalQuantity,
            totalPrice: newTotalPrice,
            updatedAt: new Date()
          })

          // ordersCancel 컬렉션에 부분 취소 정보 저장
          const cancelledItems = orderData.items?.filter((item: { paymentId: string }) => item.paymentId === paymentId) || []

          // 취소된 상품에 사용된 포인트 계산
          // paymentInfo에서 해당 paymentId의 usedPoint를 직접 가져옴
          const cancelledPaymentInfo = existingPaymentInfo.find((info: { id?: string; paymentId?: string; usedPoint?: number }) =>
            (paymentId && (info.id === paymentId || info.paymentId === paymentId)) ||
            (!paymentId || paymentId === '' || paymentId === 'point-only')
          )

          let refundPoint = 0
          if (cancelledPaymentInfo?.usedPoint) {
            refundPoint = cancelledPaymentInfo.usedPoint
            console.log('[Cancel API] 추가 주문 취소 - paymentInfo에서 직접 환불 포인트 가져옴:', {
              paymentId: paymentId,
              환불포인트: refundPoint
            })
          } else {
            // paymentInfo에 usedPoint가 없으면 구버전 로직 사용 (비례 배분)
            const cancelledItemsTotal = cancelledItems.reduce((sum: number, item: { itemPrice?: number; price: number; quantity: number }) => {
              return sum + (item.itemPrice || (item.price * item.quantity))
            }, 0)
            const totalUsedPoint = orderData.usedPoint || 0
            const originalTotalProductPrice = orderData.totalProductPrice || 0

            if (totalUsedPoint > 0 && originalTotalProductPrice > 0) {
              refundPoint = Math.floor((cancelledItemsTotal / originalTotalProductPrice) * totalUsedPoint)
              console.log('[Cancel API] 부분 취소 포인트 환불 계산 (구버전 비례배분):', {
                취소상품금액: cancelledItemsTotal,
                전체상품금액: originalTotalProductPrice,
                전체사용포인트: totalUsedPoint,
                환불포인트: refundPoint
              })
            }
          }

          await addDoc(collection(db, 'ordersCancel'), {
            orderId: foundOrderId,
            paymentId: paymentId,
            cancelReason: reason || '판매자 요청 - 추가주문 취소',
            refundAmount: refundAmount,
            refundPoint: refundPoint,
            isPartnerCancel: isPartnerCancel || false,
            isPartialCancel: true,
            orderStatus: currentOrderStatus,
            newOrderStatus: currentOrderStatus, // 부분 취소는 상태 변경 없음
            items: cancelledItems,
            uid: orderData.uid || '',
            storeId: orderData.storeId || '',
            storeName: orderData.storeName || '',
            cancelledAt: serverTimestamp(),
            createdAt: serverTimestamp()
          })

          console.log('[Cancel API] ordersCancel 컬렉션에 부분 취소 정보 저장 완료')

          // 포인트 환불 처리 (부분 취소)
          if (refundPoint > 0 && orderData.uid) {
            console.log('[Cancel API] 부분 취소 포인트 환불:', refundPoint, 'P')

            // 사용자 포인트 복구
            const userRef = doc(db, 'users', orderData.uid)
            await updateDoc(userRef, {
              point: increment(refundPoint)
            })

            // 포인트 내역 추가
            await addDoc(collection(db, 'points'), {
              uid: orderData.uid,
              amount: refundPoint,
              type: 'refund',
              reason: '추가주문 취소로 인한 포인트 환불',
              orderId: foundOrderId,
              paymentId: paymentId,
              productId: cancelledItems[0]?.productId || '',
              productName: cancelledItems[0]?.productName || orderData.storeName || '',
              createdAt: serverTimestamp()
            })

            // 주문 문서의 usedPoint 업데이트
            const currentUsedPoint = orderData.usedPoint || 0
            await updateDoc(orderRef, {
              usedPoint: currentUsedPoint - refundPoint
            })

            console.log('[Cancel API] 주문 문서 usedPoint 업데이트:', {
              이전: currentUsedPoint,
              환불: refundPoint,
              새값: currentUsedPoint - refundPoint
            })

            console.log('[Cancel API] 부분 취소 포인트 환불 완료:', refundPoint, 'P')
          }
        } else {
          // 전체 주문 취소: orderStatus 변경
          let newOrderStatus: string
          if (isPartnerCancel) {
            // 판매자 취소는 항상 'rejected'
            newOrderStatus = 'rejected'
          } else {
            // 고객 취소는 pending 상태면 cancelled_before_accept, 그 외는 cancelled
            newOrderStatus = currentOrderStatus === 'pending' ? 'cancelled_before_accept' : 'cancelled'
          }

          console.log('[Cancel API] 전체 취소 - orderStatus 업데이트:', currentOrderStatus, '->', newOrderStatus, isPartnerCancel ? '(판매자 취소)' : '(고객 취소)')

          await updateDoc(orderRef, {
            paymentStatus: 'refunded',
            orderStatus: newOrderStatus,
            paymentInfo: updatedPaymentInfo,
            updatedAt: new Date()
          })

          // 포인트 환불 처리 (전체 취소)
          const usedPoint = orderData.usedPoint || 0

          console.log('[Cancel API] 전체 취소 - 사용된 포인트:', usedPoint, 'orderData.uid:', orderData.uid)

          // ordersCancel 컬렉션에 취소 정보 저장
          await addDoc(collection(db, 'ordersCancel'), {
            orderId: foundOrderId,
            paymentId: paymentId || null,
            cancelReason: reason || '고객 요청에 의한 취소',
            refundAmount: refundAmount || 0,
            refundPoint: usedPoint,
            isPartnerCancel: isPartnerCancel || false,
            isPartialCancel: false,
            orderStatus: currentOrderStatus,
            newOrderStatus: newOrderStatus,
            totalPrice: orderData.totalPrice || 0,
            totalProductPrice: orderData.totalProductPrice || 0,
            deliveryFee: orderData.deliveryFee || 0,
            items: orderData.items || [],
            uid: orderData.uid || '',
            storeId: orderData.storeId || '',
            storeName: orderData.storeName || '',
            cancelledAt: serverTimestamp(),
            createdAt: serverTimestamp()
          })

          console.log('[Cancel API] ordersCancel 컬렉션에 취소 정보 저장 완료')

          // 포인트 환불 처리
          if (usedPoint > 0 && orderData.uid) {
            console.log('[Cancel API] 전체 취소 포인트 환불:', usedPoint, 'P')

            try {
              // 사용자 포인트 복구
              console.log('[Cancel API] 사용자 포인트 복구 시작:', orderData.uid)
              const userRef = doc(db, 'users', orderData.uid)
              await updateDoc(userRef, {
                point: increment(usedPoint)
              })
              console.log('[Cancel API] 사용자 포인트 복구 완료')

              // 포인트 내역 추가
              console.log('[Cancel API] 포인트 내역 추가 시작')
              await addDoc(collection(db, 'points'), {
                uid: orderData.uid,
                amount: usedPoint,
                type: 'refund',
                reason: '주문 취소로 인한 포인트 환불',
                orderId: foundOrderId,
                productId: orderData.productId || '',
                productName: orderData.productName || orderData.storeName || '',
                createdAt: serverTimestamp()
              })
              console.log('[Cancel API] 포인트 내역 추가 완료')

              console.log('[Cancel API] 전체 취소 포인트 환불 완료:', usedPoint, 'P')
            } catch (pointError) {
              console.error('[Cancel API] 포인트 환불 처리 실패:', pointError)
              throw pointError
            }
          }
        }

        console.log('[Cancel API] DB 업데이트 완료:', foundOrderId)

        // 취소 알림 발송 (파트너 + 고객)
        try {
          // 파트너 정보 가져오기
          let partnerPhone: string | undefined
          let partnerId: string | undefined

          if (orderData.storeId) {
            const storeRef = doc(db, 'stores', orderData.storeId)
            const storeDoc = await getDoc(storeRef)
            if (storeDoc.exists()) {
              const storeData = storeDoc.data()
              partnerPhone = storeData?.phone
              partnerId = storeData?.partnerId
            }
          }

          // 고객 정보
          const customerPhone = orderData.deliveryInfo?.recipientPhone || orderData.phone
          const customerId = orderData.uid

          // 취소 금액 계산
          const cancelAmount = isPartialCancel
            ? (refundAmount || 0)
            : (orderData.totalPrice || 0)

          const refundAmt = isPartialCancel
            ? (refundAmount || 0)
            : (orderData.totalPrice || 0)

          // 환불 비율 계산 (부분 취소는 100%, 전체 취소는 취소 사유에서 계산된 값 사용)
          const refundRateValue = isPartialCancel ? 1.0 : (refundAmount ? refundAmount / (orderData.totalPrice || 1) : 1.0)

          console.log('[Cancel API] 취소 알림 발송 준비:', {
            partnerPhone,
            partnerId,
            customerPhone,
            customerId,
            storeName: orderData.storeName,
            orderNumber: orderData.orderNumber,
            cancelAmount,
            refundAmount: refundAmt,
            refundRate: refundRateValue,
            cancelReason: reason
          })

          // 알림 발송 (직접 함수 호출)
          await sendCancellationNotification({
            partnerPhone,
            customerPhone,
            partnerId,
            customerId,
            storeName: orderData.storeName || '',
            orderNumber: orderData.orderNumber || foundOrderId,
            cancelAmount,
            refundAmount: refundAmt,
            refundRate: refundRateValue,
            cancelReason: reason || '취소',
            isPartialCancel: isPartialCancel || false,
          })

          console.log('[Cancel API] 취소 알림 발송 완료')
        } catch (notificationError) {
          console.error('[Cancel API] 취소 알림 발송 실패:', notificationError)
          // 알림 발송 실패는 치명적이지 않으므로 계속 진행
        }
      } else {
        console.warn('[Cancel API] 주문을 찾을 수 없음:', paymentId || orderId)
      }
    } catch (dbError) {
      console.error('[Cancel API] DB 업데이트 실패:', dbError)
      // DB 업데이트 실패해도 웹훅이 처리하므로 에러는 로그만
    }

    return NextResponse.json({
      success: true,
      cancellation: cancelResponse,
    })
  } catch (error) {
    console.error('Payment cancellation error:', error)

    // PortOne SDK 에러 처리
    if (error instanceof PortOne.PortOneError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'PortOne API error',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
