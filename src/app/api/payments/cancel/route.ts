import { NextRequest, NextResponse } from 'next/server'
import * as PortOne from '@portone/server-sdk'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore'

// PortOne V2 SDK로 결제 취소
export async function POST(request: NextRequest) {
  try {
    const { paymentId, reason, refundAmount, isPartnerCancel, isPartialCancel } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: 'paymentId is required' },
        { status: 400 }
      )
    }

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
    const cancelResponse = await client.payment.cancelPayment({
      paymentId: paymentId,
      reason: reason || '고객 요청에 의한 취소',
      amount: refundAmount, // 부분 취소 금액 (전체 취소는 undefined)
    })

    console.log('[Cancel API] PortOne V2 결제 취소 완료:', {
      paymentId: paymentId,
      cancelledAmount: refundAmount,
      status: 'cancelled'
    })

    // 결제 취소 성공 후 바로 DB 업데이트
    try {
      // paymentId로 주문 검색
      const ordersRef = collection(db, 'orders')
      const q = query(ordersRef, where('paymentId', 'array-contains', paymentId))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const orderDoc = querySnapshot.docs[0]
        const orderId = orderDoc.id
        const orderData = orderDoc.data()
        const existingPaymentInfo = orderData.paymentInfo || []
        const currentOrderStatus = orderData.orderStatus

        console.log('[Cancel API] 주문 찾음:', orderId, '현재 상태:', currentOrderStatus)

        // paymentInfo에서 해당 paymentId 찾아서 status를 'cancelled'로 변경
        const updatedPaymentInfo = existingPaymentInfo.map((info: { id: string; status: string; cancelledAt?: Date }) => {
          if (info.id === paymentId) {
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
        const orderRef = doc(db, 'orders', orderId)

        if (isPartialCancel) {
          // 부분 취소 (추가주문 취소 등): orderStatus 변경 없이 paymentInfo, items, paymentId 업데이트
          console.log('[Cancel API] 부분 취소 - orderStatus 유지:', currentOrderStatus)

          // items 배열에서 해당 paymentId를 가진 아이템 제거
          const updatedItems = (orderData.items || []).filter((item: { paymentId: string }) => item.paymentId !== paymentId)
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
          const updatedOrderDates = Array.isArray(existingOrderDates)
            ? existingOrderDates.filter((od: { paymentId?: string }) => od.paymentId !== paymentId)
            : []
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

          // 취소된 상품에 사용된 포인트 계산 (비례 배분)
          const cancelledItemsTotal = cancelledItems.reduce((sum: number, item: { itemPrice?: number; price: number; quantity: number }) => {
            return sum + (item.itemPrice || (item.price * item.quantity))
          }, 0)
          const totalUsedPoint = orderData.usedPoint || 0
          const originalTotalProductPrice = orderData.totalProductPrice || 0

          // 취소 상품 금액 비율로 포인트 환불 계산
          let refundPoint = 0
          if (totalUsedPoint > 0 && originalTotalProductPrice > 0) {
            refundPoint = Math.floor((cancelledItemsTotal / originalTotalProductPrice) * totalUsedPoint)
            console.log('[Cancel API] 부분 취소 포인트 환불 계산:', {
              취소상품금액: cancelledItemsTotal,
              전체상품금액: originalTotalProductPrice,
              전체사용포인트: totalUsedPoint,
              환불포인트: refundPoint
            })
          }

          await addDoc(collection(db, 'ordersCancel'), {
            orderId: orderId,
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
              orderId: orderId,
              paymentId: paymentId,
              productId: cancelledItems[0]?.productId || '',
              productName: cancelledItems[0]?.productName || orderData.storeName || '',
              createdAt: serverTimestamp()
            })

            // 주문 문서의 usedPoint 업데이트
            await updateDoc(orderRef, {
              usedPoint: totalUsedPoint - refundPoint
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

          // ordersCancel 컬렉션에 취소 정보 저장
          await addDoc(collection(db, 'ordersCancel'), {
            orderId: orderId,
            paymentId: paymentId,
            cancelReason: reason || '고객 요청에 의한 취소',
            refundAmount: refundAmount,
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

            // 사용자 포인트 복구
            const userRef = doc(db, 'users', orderData.uid)
            await updateDoc(userRef, {
              point: increment(usedPoint)
            })

            // 포인트 내역 추가
            await addDoc(collection(db, 'points'), {
              uid: orderData.uid,
              amount: usedPoint,
              type: 'refund',
              reason: '주문 취소로 인한 포인트 환불',
              orderId: orderId,
              productId: orderData.productId || '',
              productName: orderData.productName || orderData.storeName || '',
              createdAt: serverTimestamp()
            })

            console.log('[Cancel API] 전체 취소 포인트 환불 완료:', usedPoint, 'P')
          }
        }

        console.log('[Cancel API] DB 업데이트 완료:', orderId)
      } else {
        console.warn('[Cancel API] 주문을 찾을 수 없음:', paymentId)
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
