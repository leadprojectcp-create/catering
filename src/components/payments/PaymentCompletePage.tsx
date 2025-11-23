'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, updateDoc, addDoc, collection, increment, serverTimestamp, deleteDoc, deleteField, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Loading from '@/components/Loading'

interface OrderItem {
  quantity: number
  itemPrice?: number
  isAddItem?: boolean
  [key: string]: unknown
}

export default function PaymentCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  useEffect(() => {
    const handlePaymentComplete = async () => {
      // PortOne V2 redirect 방식: payment_id, tx_id를 쿼리 스트링으로 전달
      const paymentId = searchParams.get('payment_id') || searchParams.get('paymentId')
      const code = searchParams.get('code')
      const message = searchParams.get('message')

      // 결제 실패 또는 취소
      if (code) {
        console.error('[Payment Complete] 결제 실패:', { code, message })
        alert(`결제에 실패했습니다: ${message || '알 수 없는 오류'}`)
        router.replace('/payments')
        return
      }

      // 결제 성공 (payment_id가 있고 code가 없으면 성공)
      if (!paymentId) {
        console.error('[Payment Complete] 잘못된 접근 - payment_id 없음')
        router.replace('/payments')
        return
      }

      try {
        // 결제 검증
        console.log('[Payment Complete] 결제 검증 시작:', paymentId)
        const verifyResponse = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: paymentId }),
        })

        const verifyData = await verifyResponse.json()
        console.log('[Payment Complete] 결제 검증 결과:', verifyData)

        if (!verifyData.verified) {
          alert('결제 검증에 실패했습니다. 고객센터에 문의해주세요.')
          router.replace('/payments')
          return
        }

        // 주문 데이터 가져오기 (localStorage 우선, sessionStorage fallback)
        let pendingOrderDataStr = localStorage.getItem('pendingOrderData')
        if (!pendingOrderDataStr) {
          pendingOrderDataStr = sessionStorage.getItem('pendingOrderData')
        }

        if (!pendingOrderDataStr) {
          console.error('[Payment Complete] pendingOrderData 없음')
          alert('주문 정보가 없습니다. 다시 시도해주세요.')
          router.replace('/payments')
          return
        }

        const pendingOrderData = JSON.parse(pendingOrderDataStr)
        const {
          orderInfo, recipient, addressName, deliveryRequest, detailedRequest,
          entranceCode, deliveryMethod, parcelPaymentMethod, usePoint,
          totalPrice, totalProductPrice, deliveryFee, orderId,
          storeId, storeName, productName, items,
          partnerId, partnerPhone, cartIdParam, additionalOrderIdParam,
        } = pendingOrderData

        // 주문번호 생성 (PC와 동일)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let orderNumber = ''
        for (let i = 0; i < 8; i++) {
          orderNumber += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        let finalOrderId = orderId

        // 장바구니에서 주문하는 경우 (PC와 동일)
        if (cartIdParam && !additionalOrderIdParam) {
          const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
          const cartDocSnap = await getDoc(cartDocRef)

          if (cartDocSnap.exists()) {
            const cartData = cartDocSnap.data()
            const newOrderData: Record<string, unknown> = {
              uid: cartData.uid,
              productId: cartData.productId,
              storeId: storeId,
              storeName: storeName,
              partnerId: partnerId,
              partnerPhone: partnerPhone,
              items: items,
              totalPrice: totalPrice,
              totalProductPrice: totalProductPrice,
              totalQuantity: cartData.totalQuantity,
              deliveryFee: deliveryFee,
              deliveryMethod: deliveryMethod,
              usedPoint: usePoint,
              deliveryInfo: {
                addressName: addressName,
                deliveryDate: orderInfo.deliveryDate,
                deliveryTime: orderInfo.deliveryTime,
                address: orderInfo.address,
                detailAddress: orderInfo.detailAddress,
                zipCode: orderInfo.zipCode || '',
                entrancePassword: entranceCode || '',
                recipient: recipient,
                recipientPhone: orderInfo.phone,
                deliveryRequest: deliveryRequest,
                detailedRequest: detailedRequest,
              },
              orderer: orderInfo.orderer,
              phone: orderInfo.phone,
              orderNumber: orderNumber,
              orderStatus: 'pending',
              paymentStatus: 'paid',
              request: cartData.request,
              createdAt: cartData.createdAt instanceof Timestamp ? cartData.createdAt : serverTimestamp(),
              updatedAt: serverTimestamp()
            }

            if (deliveryMethod === '택배 배송') {
              newOrderData.parcelPaymentMethod = parcelPaymentMethod
            }

            const newOrderRef = await addDoc(collection(db, 'orders'), newOrderData)
            finalOrderId = newOrderRef.id
          }
        }

        // 결제 정보 저장 (PC와 동일)
        const orderRef = doc(db, 'orders', finalOrderId!)
        const orderSnapshot = await getDoc(orderRef)
        const existingOrderData = orderSnapshot.data()

        // 결제 정보 조회
        console.log('[Payment Complete] 결제 정보 조회 시작:', {
          paymentId,
          usePoint,
          cartIdParam,
          additionalOrderIdParam
        })

        const verifyResponse2 = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: paymentId }),
        })
        const verifyData2 = await verifyResponse2.json()
        console.log('[Payment Complete] 결제 검증 응답:', verifyData2)

        let paymentInfoArray: unknown[] = []
        let paymentIdArray: string[] = []

        if (existingOrderData?.paymentInfo) {
          paymentInfoArray = Array.isArray(existingOrderData.paymentInfo)
            ? [...existingOrderData.paymentInfo]
            : [existingOrderData.paymentInfo]
        }

        if (existingOrderData?.paymentId) {
          paymentIdArray = Array.isArray(existingOrderData.paymentId)
            ? [...existingOrderData.paymentId]
            : [existingOrderData.paymentId]
        }

        console.log('[Payment Complete] 기존 배열:', {
          paymentInfoArray,
          paymentIdArray,
          hasVerifyPayment: !!verifyData2.payment,
          paymentIdCheck: { paymentId, isNull: !paymentId, isPointOnly: paymentId === 'point-only' }
        })

        if (verifyData2.payment) {
          console.log('[Payment Complete] 일반 결제 처리')
          const payment = verifyData2.payment as { status?: string; [key: string]: unknown }
          const normalizedPayment = {
            ...payment,
            status: payment.status?.toLowerCase(),
            usedPoint: usePoint || 0 // 사용한 포인트 추가
          }
          paymentInfoArray.push(normalizedPayment)
          paymentIdArray.push(paymentId)
        } else if (!paymentId || paymentId === 'point-only') {
          console.log('[Payment Complete] 포인트 전용 결제 처리')
          // 포인트 전용 결제인 경우
          const pointPaymentInfo = {
            id: 'point-only',
            paymentId: 'point-only',
            status: 'paid',
            amount: 0, // 실제 결제 금액은 0
            usedPoint: usePoint || 0, // 사용한 포인트
            paidAt: new Date(),
            method: 'point'
          }
          paymentInfoArray.push(pointPaymentInfo)
          paymentIdArray.push('point-only')
        }

        console.log('[Payment Complete] 최종 배열:', {
          paymentInfoArray,
          paymentIdArray
        })

        // 주문 업데이트 (PC와 동일)
        if (cartIdParam && !additionalOrderIdParam) {
          console.log('[Payment Complete] 장바구니 결제 업데이트')
          const existingItems = (existingOrderData?.items as OrderItem[]) || []
          const finalPaymentId = paymentId || 'point-only'
          const itemsWithPaymentId = existingItems.map((item) => ({
            ...item,
            paymentId: finalPaymentId,
            isAddItem: false
          }))

          const updateData = {
            items: itemsWithPaymentId,
            paymentInfo: paymentInfoArray,
            paymentId: paymentIdArray,
            verifiedAt: serverTimestamp()
          }
          console.log('[Payment Complete] 장바구니 updateDoc 데이터:', updateData)
          await updateDoc(orderRef, updateData)
        } else if (additionalOrderIdParam) {
          console.log('[Payment Complete] 추가 주문 업데이트')
          const existingItems = (existingOrderData?.items as OrderItem[]) || []
          const newItems = (items as OrderItem[]) || []
          const currentTotalProductPrice = existingOrderData?.totalProductPrice || 0
          const currentTotalQuantity = existingOrderData?.totalQuantity || 0
          const currentTotalPrice = existingOrderData?.totalPrice || 0

          const finalPaymentId = paymentId || 'point-only'
          const itemsWithPaymentId = newItems.map((item) => ({
            ...item,
            paymentId: finalPaymentId,
            isAddItem: true
          }))

          const updateData = {
            paymentStatus: 'paid',
            items: [...existingItems, ...itemsWithPaymentId],
            totalProductPrice: currentTotalProductPrice + (totalProductPrice || 0),
            totalQuantity: currentTotalQuantity + (newItems.reduce((sum: number, item) => sum + item.quantity, 0)),
            totalPrice: currentTotalPrice + totalPrice,
            paymentInfo: paymentInfoArray,
            paymentId: paymentIdArray,
            verifiedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            addTotalProductPrice: deleteField(),
            addTotalQuantity: deleteField()
          }
          console.log('[Payment Complete] 추가주문 updateDoc 데이터:', updateData)
          await updateDoc(orderRef, updateData)
        } else {
          console.log('[Payment Complete] 일반 주문 업데이트')
          const existingItems = (existingOrderData?.items as OrderItem[]) || []
          const finalPaymentId = paymentId || 'point-only'
          const itemsWithPaymentId = existingItems.map((item) => ({
            ...item,
            paymentId: finalPaymentId,
            isAddItem: false
          }))

          const updateData = {
            paymentStatus: 'paid',
            items: itemsWithPaymentId,
            paymentInfo: paymentInfoArray,
            paymentId: paymentIdArray,
            verifiedAt: serverTimestamp()
          }
          console.log('[Payment Complete] 일반주문 updateDoc 데이터:', updateData)
          await updateDoc(orderRef, updateData)
        }

        // 포인트 사용 처리 (PC와 동일)
        if (usePoint > 0 && existingOrderData?.uid) {
          const userRef = doc(db, 'users', existingOrderData.uid)
          await updateDoc(userRef, {
            point: increment(-usePoint)
          })

          await addDoc(collection(db, 'points'), {
            uid: existingOrderData.uid,
            amount: -usePoint,
            type: 'used',
            reason: '주문 결제 시 포인트 사용',
            orderId: finalOrderId,
            productId: existingOrderData.productId || '',
            productName: productName || '',
            createdAt: serverTimestamp()
          })
        }

        // 장바구니 삭제 (PC와 동일)
        if (cartIdParam) {
          const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
          await deleteDoc(cartDocRef)
        }

        // 알림톡 발송 (PC와 동일)
        try {
          const isAdditionalOrder = !!additionalOrderIdParam
          const finalOrderSnapshot = await getDoc(orderRef)
          const finalOrderData = finalOrderSnapshot.data()

          const totalQuantity = finalOrderData?.totalQuantity || 0
          const finalTotalProductPrice = finalOrderData?.totalProductPrice || 0

          let additionalQuantity = 0
          let additionalProductPrice = 0

          if (isAdditionalOrder && finalOrderData?.items) {
            const additionalItems = (finalOrderData.items as OrderItem[]).filter((item) => item.isAddItem === true)
            additionalQuantity = additionalItems.reduce((sum: number, item) => sum + item.quantity, 0)
            additionalProductPrice = additionalItems.reduce((sum: number, item) => sum + (item.itemPrice || 0), 0)
          }

          await fetch('/api/notifications/send-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              partnerPhone: partnerPhone,
              customerPhone: orderInfo.phone,
              partnerId: partnerId,
              customerId: user?.uid,
              isAdditionalOrder,
              storeName: storeName || '',
              orderNumber,
              totalQuantity,
              totalProductPrice: finalTotalProductPrice,
              additionalQuantity,
              additionalProductPrice,
            }),
          })
        } catch (alimtalkError) {
          console.error('주문 알림 발송 실패:', alimtalkError)
        }

        // 스토리지 정리
        localStorage.removeItem('pendingOrderData')
        sessionStorage.removeItem('pendingOrderData')
        sessionStorage.removeItem('cartIdForPayment')
        sessionStorage.removeItem('orderData')

        // 결제 완료
        alert(`결제가 완료되었습니다!\n주문번호: ${orderNumber}`)
        router.replace('/orders')
      } catch (error) {
        console.error('[Payment Complete] 처리 중 오류:', error)
        alert('결제 처리 중 오류가 발생했습니다.')
        router.replace('/payments')
      }
    }

    if (searchParams) {
      handlePaymentComplete()
    }
  }, [router, searchParams, user])

  return <Loading />
}
