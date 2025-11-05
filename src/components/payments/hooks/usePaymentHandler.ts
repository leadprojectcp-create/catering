import { doc, getDoc, updateDoc, addDoc, collection, increment, serverTimestamp, deleteDoc, deleteField } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { requestPayment } from '@/lib/services/paymentService'
import { OrderData, OrderInfo, OrderItem, DeliveryAddress } from '../types'
import { User } from 'firebase/auth'

interface UsePaymentHandlerParams {
  user: User | null
  orderData: OrderData | null
  orderInfo: OrderInfo
  recipient: string
  addressName: string
  deliveryRequest: string
  detailedRequest: string
  entranceCode: string
  deliveryMethod: string
  usePoint: number
  totalPrice: number
  totalProductPrice: number
  deliveryFee: number
  orderId: string | null
  searchParams: URLSearchParams
  paymentMethod: 'card' | 'kakaopay' | 'naverpay'
  saveAddress: (address: Omit<DeliveryAddress, 'id'>) => Promise<DeliveryAddress>
  checkDuplicateAddress: (address: string, detailAddress: string) => Promise<boolean>
  onRouter: (path: string) => void
}

export async function handlePaymentProcess(params: UsePaymentHandlerParams): Promise<boolean> {
  const {
    user,
    orderData,
    orderInfo,
    recipient,
    addressName,
    deliveryRequest,
    detailedRequest,
    entranceCode,
    deliveryMethod,
    usePoint,
    totalPrice,
    totalProductPrice,
    deliveryFee,
    orderId,
    searchParams,
    paymentMethod,
    saveAddress,
    checkDuplicateAddress,
    onRouter
  } = params

  if (!user) {
    alert('로그인이 필요합니다.')
    onRouter('/auth/login')
    return false
  }

  if (!orderData) {
    alert('주문 정보가 없습니다.')
    return false
  }

  // 이메일 가져오기
  let userEmail = orderInfo.email
  if (!userEmail || !userEmail.trim()) {
    const userDocRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userDocRef)
    if (userDoc.exists()) {
      userEmail = userDoc.data().email || ''
    }
  }

  if (!orderId) {
    alert('주문 정보가 없습니다.')
    return false
  }

  const cartIdParam = searchParams.get('cartId')
  const additionalOrderIdParam = searchParams.get('additionalOrderId')

  // 가게 정보 가져오기
  const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
  const storeData = storeDoc.exists() ? storeDoc.data() : null

  // 추가 주문 시 배송비 환급 계산
  let deliveryFeeRefund = 0
  let actualPaymentAmount = totalPrice

  // 추가 주문인 경우 기존 주문 확인 및 무료 배송 조건 체크
  if (additionalOrderIdParam) {
    console.log('📦 추가 주문 처리 시작')
    const orderDocRef = doc(db, 'orders', orderId!)
    const orderDocSnap = await getDoc(orderDocRef)

    if (!orderDocSnap.exists()) {
      alert('주문 정보를 찾을 수 없습니다.')
      return false
    }

    const existingOrderData = orderDocSnap.data()
    const currentTotalProductPrice = existingOrderData?.totalProductPrice || 0
    const currentDeliveryFee = existingOrderData?.deliveryFee || 0

    console.log('기존 주문 총 상품 금액:', currentTotalProductPrice)
    console.log('기존 배송비:', currentDeliveryFee)
    console.log('추가 주문 상품 금액:', totalProductPrice)

    // 추가 주문 후 총 상품 금액
    const newTotalProductPrice = currentTotalProductPrice + totalProductPrice
    console.log('추가 주문 후 총 상품 금액:', newTotalProductPrice)

    // 배송비 무료 조건 확인
    const freeDeliveryThreshold = storeData?.freeDeliveryThreshold || 0
    const hadDeliveryFee = currentDeliveryFee > 0
    const meetsCondition = freeDeliveryThreshold > 0 && newTotalProductPrice >= freeDeliveryThreshold

    console.log('무료 배송 기준 금액:', freeDeliveryThreshold)
    console.log('배송비를 냈었는가?:', hadDeliveryFee)
    console.log('무료 배송 조건 달성?:', meetsCondition)

    // 기존에 배송비를 냈고, 이제 무료 배송 조건을 달성한 경우
    if (hadDeliveryFee && meetsCondition) {
      deliveryFeeRefund = currentDeliveryFee
      // 실제 결제 금액 = 추가 주문 금액 - 배송비 환급 (음수 가능)
      actualPaymentAmount = totalPrice - deliveryFeeRefund

      console.log('🎉 무료 배송 조건 달성!')
      console.log('추가 주문 금액 (totalPrice):', totalPrice)
      console.log('배송비 환급:', deliveryFeeRefund)
      console.log('실제 결제 금액 (actualPaymentAmount):', actualPaymentAmount)
    } else {
      console.log('❌ 무료 배송 조건 미달성')
      console.log('actualPaymentAmount:', actualPaymentAmount)
    }
  }

  // 결제 금액이 0원 이하면 결제창 없이 포인트 적립만 처리
  let paymentResult: { success: boolean; paymentId?: string; errorMessage?: string } = { success: false }
  let verifyData: { verified: boolean; payment?: unknown } = { verified: false }

  if (actualPaymentAmount > 0) {
    // 포트원 결제창 호출 (실제 결제 금액으로)
    paymentResult = await requestPayment({
      orderName: `${orderData.productName} ${orderData.items.length > 1 ? `외 ${orderData.items.length - 1}건` : ''}`,
      amount: actualPaymentAmount,
      orderId: cartIdParam || orderId || 'temp',
      customerName: orderInfo.orderer,
      customerEmail: userEmail,
      customerPhoneNumber: orderInfo.phone,
      customerUid: user?.uid,
      payMethod: paymentMethod,
    })

    if (!paymentResult.success) {
      alert(`결제에 실패했습니다.\n${paymentResult.errorMessage || '알 수 없는 오류'}`)
      return false
    }

    // 서버에서 결제 검증
    console.log('결제 검증 시작:', paymentResult.paymentId)
    const verifyResponse = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imp_uid: paymentResult.paymentId }),
    })

    verifyData = await verifyResponse.json()
    console.log('결제 검증 결과:', verifyData)

    if (!verifyData.verified) {
      alert('결제 검증에 실패했습니다. 고객센터에 문의해주세요.')
      return false
    }
  } else if (actualPaymentAmount < 0) {
    // 결제 금액이 음수인 경우: 결제 없이 포인트 적립만 처리
    console.log('🎉 결제 금액 음수 - 포인트 적립만 처리, 적립 포인트:', Math.abs(actualPaymentAmount))
    paymentResult = { success: true }
    verifyData = { verified: true }
  } else {
    // 결제 금액이 정확히 0원인 경우
    console.log('🎉 결제 금액 0원 - 주문만 처리')
    paymentResult = { success: true }
    verifyData = { verified: true }
  }

  // ✅ 결제 검증 성공! 이제 DB에 저장 시작
  const orderNumber = `ORD${Date.now()}`
  let finalOrderId = orderId

  // 장바구니에서 주문하는 경우: orders 컬렉션에 새로 생성
  if (cartIdParam && !additionalOrderIdParam) {
    const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
    const cartDocSnap = await getDoc(cartDocRef)

    if (!cartDocSnap.exists()) {
      alert('장바구니 정보를 찾을 수 없습니다.')
      return false
    }

    const cartData = cartDocSnap.data()

    const newOrderData = {
      uid: cartData.uid,
      productId: cartData.productId,
      storeId: cartData.storeId,
      storeName: cartData.storeName,
      partnerId: storeData?.partnerId,
      partnerPhone: storeData?.phone,
      items: cartData.items,
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
      updatedAt: new Date()
    }

    const newOrderRef = await addDoc(collection(db, 'orders'), newOrderData)
    finalOrderId = newOrderRef.id
    console.log('✅ 결제 성공 후 shoppingCart에서 orders로 이동 완료:', finalOrderId)
  }

  // 결제 정보 저장
  const orderRef = doc(db, 'orders', finalOrderId!)
  const orderSnapshot = await getDoc(orderRef)
  const existingOrderData = orderSnapshot.data()

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

  // actualPaymentAmount가 0보다 클 때만 결제 정보 저장
  if (actualPaymentAmount > 0 && verifyData.payment) {
    const payment = verifyData.payment as { status?: string; [key: string]: unknown }
    const normalizedPayment = {
      ...payment,
      status: payment.status?.toLowerCase()
    }
    paymentInfoArray.push(normalizedPayment)
    if (paymentResult.paymentId) {
      paymentIdArray.push(paymentResult.paymentId)
    }
  }

  // 장바구니에서 생성된 경우: 이미 모든 정보가 저장되어 있으므로 paymentInfo만 업데이트
  if (cartIdParam && !additionalOrderIdParam) {
    const currentPaymentId = paymentIdArray.length > 0 ? paymentIdArray[paymentIdArray.length - 1] : undefined
    const existingItems = existingOrderData?.items || []

    const itemsWithPaymentId = existingItems.map((item: OrderItem) => ({
      ...item,
      ...(currentPaymentId && { paymentId: currentPaymentId }),
      isAddItem: false
    }))

    const updateData: Record<string, unknown> = {
      items: itemsWithPaymentId,
      verifiedAt: new Date().toISOString()
    }

    // actualPaymentAmount가 0보다 클 때만 paymentInfo, paymentId 저장
    if (actualPaymentAmount > 0) {
      updateData.paymentInfo = paymentInfoArray
      updateData.paymentId = paymentIdArray
    }

    await updateDoc(orderRef, updateData)
    console.log('✅ 장바구니 주문 결제 정보 업데이트 완료')
  }
  // 추가 주문인 경우
  else if (additionalOrderIdParam) {
    const additionalDataStr = sessionStorage.getItem('additionalOrderData')
    if (!additionalDataStr) {
      alert('추가 주문 정보를 찾을 수 없습니다.')
      return false
    }

    try {
      const additionalData = JSON.parse(additionalDataStr)
      const existingItems = existingOrderData?.items || []
      const newItems = additionalData.items || []

      const currentTotalProductPrice = existingOrderData?.totalProductPrice || 0
      const currentTotalQuantity = existingOrderData?.totalQuantity || 0
      const currentTotalPrice = existingOrderData?.totalPrice || 0
      const currentPaymentId = paymentIdArray.length > 0 ? paymentIdArray[paymentIdArray.length - 1] : undefined

      // 추가 주문 후 총 상품 금액
      const newTotalProductPrice = currentTotalProductPrice + (additionalData.totalProductPrice || 0)

      const itemsWithPaymentId = newItems.map((item: OrderItem) => ({
        ...item,
        ...(currentPaymentId && { paymentId: currentPaymentId }),
        isAddItem: true
      }))

      // 실제 결제한 금액만 totalPrice에 추가
      const updateData: Record<string, unknown> = {
        paymentStatus: 'paid',
        items: [...existingItems, ...itemsWithPaymentId],
        totalProductPrice: newTotalProductPrice,
        totalQuantity: currentTotalQuantity + (additionalData.totalQuantity || 0),
        totalPrice: currentTotalPrice + actualPaymentAmount,
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date(),
        addTotalProductPrice: deleteField(),
        addTotalQuantity: deleteField()
      }

      // 배송비 환급이 발생한 경우 (actualPaymentAmount < 0) deliveryFee를 0으로 업데이트
      if (actualPaymentAmount < 0) {
        updateData.deliveryFee = 0
      }

      // actualPaymentAmount가 0보다 클 때만 paymentInfo, paymentId 저장
      if (actualPaymentAmount > 0) {
        updateData.paymentInfo = paymentInfoArray
        updateData.paymentId = paymentIdArray
      }

      await updateDoc(orderRef, updateData)

      // 결제 금액이 음수인 경우 포인트 적립 처리
      if (actualPaymentAmount < 0 && user) {
        // 실제 적립 금액 = actualPaymentAmount의 절댓값
        const pointAmount = Math.abs(actualPaymentAmount)
        console.log('💰 포인트 적립 시작')
        console.log('- 적립액:', pointAmount)
        console.log('- 사용자 UID:', user.uid)
        console.log('- 주문 ID:', finalOrderId)

        try {
          const userRef = doc(db, 'users', user.uid)
          console.log('📝 users 컬렉션 업데이트 시작...')
          await updateDoc(userRef, {
            point: increment(pointAmount)
          })
          console.log('✅ users 컬렉션 업데이트 완료')

          console.log('📝 points 컬렉션에 이력 저장 시작...')
          const pointDoc = await addDoc(collection(db, 'points'), {
            uid: user.uid,
            amount: pointAmount,
            type: 'earned',
            reason: '추가 주문으로 배송비 환급',
            orderId: finalOrderId,
            productId: orderData?.productId || '',
            productName: orderData?.productName || '',
            isRefundable: true,
            createdAt: serverTimestamp()
          })
          console.log('✅ points 컬렉션 저장 완료, 문서 ID:', pointDoc.id)

          console.log('🎉 포인트 적립 완료:', pointAmount)
        } catch (pointError) {
          console.error('❌ 포인트 적립 실패:', pointError)
          console.error('에러 상세:', pointError)
        }
      }

      console.log('✅ 추가 주문 결제 완료:', {
        기존총액: currentTotalPrice,
        추가주문금액: totalPrice,
        실제결제금액: actualPaymentAmount,
        배송비환급: deliveryFeeRefund,
        포인트적립: deliveryFeeRefund > 0 ? deliveryFeeRefund - totalPrice : 0,
        최종총액: currentTotalPrice + actualPaymentAmount
      })

      sessionStorage.removeItem('additionalOrderData')

      // 배송비 환급이 있는 경우 사용자에게 알림
      if (deliveryFeeRefund > 0) {
        const pointAmount = deliveryFeeRefund - totalPrice
        setTimeout(() => {
          if (pointAmount > 0) {
            alert(`🎉 무료 배송 조건을 달성하셨습니다!\n결제 금액: ${actualPaymentAmount.toLocaleString()}원\n포인트 적립: ${pointAmount.toLocaleString()}원`)
          } else {
            alert(`🎉 무료 배송 조건을 달성하셨습니다!\n결제 금액: ${actualPaymentAmount.toLocaleString()}원`)
          }
        }, 100)
      }
    } catch (error) {
      console.error('[Payment] 추가 주문 처리 실패:', error)
      alert('추가 주문 처리에 실패했습니다.')
      return false
    }
  }
  // 일반 주문 (바로 구매)인 경우
  else {
    const currentPaymentId = paymentIdArray.length > 0 ? paymentIdArray[paymentIdArray.length - 1] : undefined
    const existingItems = existingOrderData?.items || []

    const itemsWithPaymentId = existingItems.map((item: OrderItem) => ({
      ...item,
      ...(currentPaymentId && { paymentId: currentPaymentId }),
      isAddItem: false
    }))

    const updateData: Record<string, unknown> = {
      paymentStatus: 'paid',
      items: itemsWithPaymentId,
      verifiedAt: new Date().toISOString()
    }

    // actualPaymentAmount가 0보다 클 때만 paymentInfo, paymentId 저장
    if (actualPaymentAmount > 0) {
      updateData.paymentInfo = paymentInfoArray
      updateData.paymentId = paymentIdArray
    }

    await updateDoc(orderRef, updateData)
    console.log('✅ 일반 주문 결제 정보 업데이트 완료')
  }

  // 배송지 저장
  if ((deliveryMethod === '퀵업체 배송' || deliveryMethod === '택배 배송') && orderInfo.address.trim() && addressName.trim()) {
    try {
      const isDuplicate = await checkDuplicateAddress(orderInfo.address, orderInfo.detailAddress)
      if (!isDuplicate) {
        await saveAddress({
          name: addressName,
          orderer: recipient,
          phone: orderInfo.phone,
          email: userEmail,
          address: orderInfo.address,
          detailAddress: orderInfo.detailAddress,
          zipCode: orderInfo.zipCode || ''
        })
      }
    } catch (addressError) {
      console.error('배송지 저장 실패:', addressError)
    }
  }

  // 포인트 사용 처리
  if (usePoint > 0 && user) {
    try {
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        point: increment(-usePoint)
      })

      await addDoc(collection(db, 'points'), {
        uid: user.uid,
        amount: -usePoint,
        type: 'used',
        reason: '주문 결제 시 포인트 사용',
        orderId: finalOrderId,
        productId: orderData?.productId || '',
        productName: orderData?.productName || '',
        createdAt: serverTimestamp()
      })
    } catch (pointError) {
      console.error('포인트 사용 처리 실패:', pointError)
    }
  }

  // 장바구니 삭제
  if (cartIdParam) {
    try {
      const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
      await deleteDoc(cartDocRef)
    } catch (cartDeleteError) {
      console.error('장바구니 삭제 실패:', cartDeleteError)
    }
  }

  sessionStorage.removeItem('orderData')
  alert(`결제가 완료되었습니다!\n주문번호: ${orderNumber}`)
  onRouter('/orders')

  return true
}
