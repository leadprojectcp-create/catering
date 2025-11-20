import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, updateDoc, addDoc, collection, increment, serverTimestamp, deleteDoc, deleteField } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { sendOrderNotification } from '@/lib/services/smsService'

interface OrderItem {
  quantity: number
  itemPrice?: number
  isAddItem?: boolean
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Process Order API] 받은 body:', body)

    const {
      paymentId,
      pendingOrderData
    } = body

    console.log('[Process Order API] paymentId:', paymentId)
    console.log('[Process Order API] pendingOrderData:', pendingOrderData)

    if (!pendingOrderData) {
      console.error('[Process Order API] pendingOrderData 없음')
      return NextResponse.json(
        { error: 'No pending order data', message: '주문 정보가 없습니다.' },
        { status: 400 }
      )
    }

    const {
      orderInfo,
      recipient,
      addressName,
      deliveryRequest,
      detailedRequest,
      entranceCode,
      deliveryMethod,
      parcelPaymentMethod,
      usePoint,
      totalPrice,
      totalProductPrice,
      deliveryFee,
      orderId,
      storeId,
      storeName,
      productName,
      items,
      partnerId,
      partnerPhone,
      cartIdParam,
      additionalOrderIdParam,
    } = pendingOrderData

    // 주문번호 생성
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let orderNumber = ''
    for (let i = 0; i < 8; i++) {
      orderNumber += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    let finalOrderId = orderId

    // 장바구니에서 주문하는 경우
    if (cartIdParam && !additionalOrderIdParam) {
      const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
      const cartDocSnap = await getDoc(cartDocRef)

      if (!cartDocSnap.exists()) {
        return NextResponse.json(
          { error: 'Cart not found' },
          { status: 404 }
        )
      }

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
        createdAt: cartData.createdAt || new Date(),
        updatedAt: new Date(),
        orderDates: [{
          type: 'regular',
          createdAt: serverTimestamp(),
          paymentId: paymentId
        }]
      }

      if (deliveryMethod === '택배 배송') {
        newOrderData.parcelPaymentMethod = parcelPaymentMethod
      }

      const newOrderRef = await addDoc(collection(db, 'orders'), newOrderData)
      finalOrderId = newOrderRef.id
    }

    // 결제 정보 저장
    const orderRef = doc(db, 'orders', finalOrderId!)
    const orderSnapshot = await getDoc(orderRef)
    const existingOrderData = orderSnapshot.data()

    // 결제 정보 조회
    const verifyResponse = await fetch(`${request.nextUrl.origin}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId }),
    })

    const verifyData = await verifyResponse.json()

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

    if (verifyData.payment) {
      const payment = verifyData.payment as { status?: string; [key: string]: unknown }
      const normalizedPayment = {
        ...payment,
        status: payment.status?.toLowerCase()
      }
      paymentInfoArray.push(normalizedPayment)
      paymentIdArray.push(paymentId)
    }

    // 주문 업데이트
    if (cartIdParam && !additionalOrderIdParam) {
      const existingItems = (existingOrderData?.items as OrderItem[]) || []
      const itemsWithPaymentId = existingItems.map((item) => ({
        ...item,
        paymentId: paymentId,
        isAddItem: false
      }))

      await updateDoc(orderRef, {
        items: itemsWithPaymentId,
        paymentInfo: paymentInfoArray,
        paymentId: paymentIdArray,
        verifiedAt: new Date().toISOString()
      })
    } else if (additionalOrderIdParam) {
      const existingItems = (existingOrderData?.items as OrderItem[]) || []
      const newItems = (items as OrderItem[]) || []
      const currentTotalProductPrice = existingOrderData?.totalProductPrice || 0
      const currentTotalQuantity = existingOrderData?.totalQuantity || 0
      const currentTotalPrice = existingOrderData?.totalPrice || 0

      const itemsWithPaymentId = newItems.map((item) => ({
        ...item,
        paymentId: paymentId,
        isAddItem: true
      }))

      // 기존 orderDates 배열 가져오기
      const existingOrderDates = existingOrderData?.orderDates || []

      await updateDoc(orderRef, {
        paymentStatus: 'paid',
        items: [...existingItems, ...itemsWithPaymentId],
        totalProductPrice: currentTotalProductPrice + (totalProductPrice || 0),
        totalQuantity: currentTotalQuantity + (newItems.reduce((sum: number, item) => sum + item.quantity, 0)),
        totalPrice: currentTotalPrice + totalPrice,
        paymentInfo: paymentInfoArray,
        paymentId: paymentIdArray,
        orderDates: [
          ...existingOrderDates,
          {
            type: 'additional',
            createdAt: serverTimestamp(),
            paymentId: paymentId
          }
        ],
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date(),
        addTotalProductPrice: deleteField(),
        addTotalQuantity: deleteField()
      })
    } else {
      const existingItems = (existingOrderData?.items as OrderItem[]) || []
      const itemsWithPaymentId = existingItems.map((item) => ({
        ...item,
        paymentId: paymentId,
        isAddItem: false
      }))

      await updateDoc(orderRef, {
        paymentStatus: 'paid',
        items: itemsWithPaymentId,
        paymentInfo: paymentInfoArray,
        paymentId: paymentIdArray,
        verifiedAt: new Date().toISOString()
      })
    }

    // 포인트 사용 처리
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

    // 장바구니 삭제
    if (cartIdParam) {
      const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
      await deleteDoc(cartDocRef)
    }

    // 알림톡 발송
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

      await sendOrderNotification({
        partnerPhone: partnerPhone,
        customerPhone: orderInfo.phone,
        partnerId: partnerId,
        customerId: finalOrderData?.uid as string | undefined,
        isAdditionalOrder,
        storeName: storeName || '',
        orderNumber,
        totalQuantity,
        totalProductPrice: finalTotalProductPrice,
        additionalQuantity,
        additionalProductPrice,
      })
    } catch (error) {
      console.error('주문 알림 발송 실패:', error)
    }

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId: finalOrderId
    })
  } catch (error) {
    console.error('[Process Order API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process order' },
      { status: 500 }
    )
  }
}
