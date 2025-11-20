import { doc, getDoc, updateDoc, addDoc, collection, increment, serverTimestamp, deleteDoc, deleteField, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { requestPayment } from '@/lib/services/paymentService'
import { sendOrderAlimtalk } from '@/lib/services/smsService'
import { OrderData, OrderInfo, OrderItem, DeliveryAddress } from '../types'
import { User } from 'firebase/auth'
import { DeliveryFeeBreakdown } from '../utils/calculateDeliveryFeeBreakdown'

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
  parcelPaymentMethod: '선결제' | '착불'
  usePoint: number
  totalPrice: number
  totalProductPrice: number
  deliveryFee: number
  deliveryFeeBreakdown?: DeliveryFeeBreakdown
  orderId: string | null
  searchParams: URLSearchParams
  paymentMethod: 'card' | 'kakaopay' | 'naverpay'
  paymentType: 'card' | 'vbank' | 'trans' | 'easy'
  saveAddress: (address: Omit<DeliveryAddress, 'id'>) => Promise<DeliveryAddress>
  checkDuplicateAddress: (address: string, detailAddress: string) => Promise<boolean>
  onRouter: (path: string) => void
  quickDeliveryFeeSettings?: {
    type: '무료' | '조건부 지원' | '유료'
    freeCondition?: number
    maxSupport?: number
  } | null
  deliveryFeeSettings?: {
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    perQuantity?: number
  } | null
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
    parcelPaymentMethod,
    usePoint,
    totalPrice,
    totalProductPrice,
    deliveryFee,
    orderId,
    searchParams,
    paymentMethod,
    paymentType,
    saveAddress,
    checkDuplicateAddress,
    onRouter,
    quickDeliveryFeeSettings,
    deliveryFeeSettings
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

  // 결제 금액은 totalPrice 그대로 사용
  const actualPaymentAmount = totalPrice

  // 결제 처리
  let paymentResult: { success: boolean; paymentId?: string; errorMessage?: string } = { success: false }
  let verifyData: { verified: boolean; payment?: unknown } = { verified: false }

  if (actualPaymentAmount > 0) {
    // 결제 타입에 따라 채널키 결정
    const channelKey = paymentType === 'easy'
      ? process.env.NEXT_PUBLIC_PORTONE_EASY_CHANNEL_KEY!  // 간편결제
      : process.env.NEXT_PUBLIC_PORTONE_GENERAL_CHANNEL_KEY!  // 일반결제(카드)

    // 장바구니 ID를 sessionStorage에 저장 (모바일 리다이렉트 시 사용)
    if (cartIdParam) {
      sessionStorage.setItem('cartIdForPayment', cartIdParam)
    }

    // V2에서는 paymentType이 vbank/trans인 경우 해당 결제수단 사용
    // 그 외에는 paymentMethod로 CARD/EASY_PAY 결정
    let v2PayMethod: 'CARD' | 'VIRTUAL_ACCOUNT' | 'TRANSFER' | 'EASY_PAY'
    if (paymentType === 'vbank') {
      v2PayMethod = 'VIRTUAL_ACCOUNT'
    } else if (paymentType === 'trans') {
      v2PayMethod = 'TRANSFER'
    } else {
      // 일반결제/간편결제는 paymentMethod로 결정
      v2PayMethod = paymentMethod === 'card' ? 'CARD' : 'EASY_PAY'
    }

    // V2에서는 EASY_PAY일 때 provider 지정
    let easyPayProvider: 'KAKAOPAY' | 'NAVERPAY' | 'TOSSPAY' | undefined
    if (v2PayMethod === 'EASY_PAY') {
      if (paymentMethod === 'kakaopay') {
        easyPayProvider = 'KAKAOPAY'
      } else if (paymentMethod === 'naverpay') {
        easyPayProvider = 'NAVERPAY'
      }
    }

    // 모바일 redirect를 위해 주문 데이터를 localStorage에 저장 (sessionStorage는 새 창에서 공유 안됨)
    const pendingData = {
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
      userEmail,
      storeId: orderData.storeId,
      storeName: orderData.storeName,
      productName: orderData.productName,
      items: orderData.items,
      partnerId: storeData?.partnerId,
      partnerPhone: storeData?.phone,
      cartIdParam,
      additionalOrderIdParam,
    }

    // localStorage와 sessionStorage 둘 다 저장 (호환성)
    localStorage.setItem('pendingOrderData', JSON.stringify(pendingData))
    sessionStorage.setItem('pendingOrderData', JSON.stringify(pendingData))

    // 포트원 V2 결제창 호출
    paymentResult = await requestPayment({
      orderName: '주식회사 리프컴퍼니',
      amount: actualPaymentAmount,
      orderId: cartIdParam || orderId || 'temp',
      customerName: orderInfo.orderer,
      customerEmail: userEmail,
      customerPhoneNumber: orderInfo.phone,
      customerUid: user?.uid,
      payMethod: v2PayMethod,
      easyPayProvider: easyPayProvider,
      channelKey: channelKey,
    })

    // PC는 여기서 callback으로 응답을 받습니다
    // 모바일은 redirectUrl로 이동하므로 여기까지 도달하지 않습니다
    if (!paymentResult.success) {
      alert(`결제에 실패했습니다.\n${paymentResult.errorMessage || '알 수 없는 오류'}`)
      return false
    }

    // 서버에서 결제 검증 (PC만)
    console.log('결제 검증 시작:', paymentResult.paymentId)
    const verifyResponse = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_id: paymentResult.paymentId }),
    })

    verifyData = await verifyResponse.json()
    console.log('결제 검증 결과:', verifyData)

    if (!verifyData.verified) {
      alert('결제 검증에 실패했습니다. 고객센터에 문의해주세요.')
      return false
    }
  } else {
    // 결제 금액이 0원인 경우
    console.log('🎉 결제 금액 0원 - 주문만 처리')
    paymentResult = { success: true }
    verifyData = { verified: true }
  }

  // ✅ 결제 검증 성공! 이제 DB에 저장 시작
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let orderNumber = ''
  for (let i = 0; i < 8; i++) {
    orderNumber += chars.charAt(Math.floor(Math.random() * chars.length))
  }
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

    const newOrderData: Record<string, unknown> = {
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
      createdAt: cartData.createdAt instanceof Timestamp ? cartData.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
      orderDates: [{
        type: 'regular',
        createdAt: serverTimestamp(),
        paymentId: paymentResult.paymentId || ''
      }]
    }

    // 택배 배송인 경우에만 parcelPaymentMethod 추가
    if (deliveryMethod === '택배 배송') {
      newOrderData.parcelPaymentMethod = parcelPaymentMethod
    }

    // 퀵 배송비 설정 저장
    if (deliveryMethod === '퀵업체 배송' && quickDeliveryFeeSettings) {
      newOrderData.quickDeliveryFeeSettings = quickDeliveryFeeSettings
    }

    // 택배 배송비 설정 저장
    if (deliveryMethod === '택배 배송' && deliveryFeeSettings) {
      newOrderData.deliveryFeeSettings = deliveryFeeSettings
    }

    // 배송비 분리 정보 저장
    if (params.deliveryFeeBreakdown) {
      newOrderData.deliveryFeeBreakdown = {
        customerFee: params.deliveryFeeBreakdown.customerFee,
        storeFee: params.deliveryFeeBreakdown.storeFee,
        feeType: params.deliveryFeeBreakdown.feeType
      }
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
      verifiedAt: serverTimestamp()
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

      // 기존 orderDates 배열 가져오기
      const existingOrderDates = existingOrderData?.orderDates || []

      // 실제 결제한 금액만 totalPrice에 추가
      const updateData: Record<string, unknown> = {
        paymentStatus: 'paid',
        items: [...existingItems, ...itemsWithPaymentId],
        totalProductPrice: newTotalProductPrice,
        totalQuantity: currentTotalQuantity + (additionalData.totalQuantity || 0),
        totalPrice: currentTotalPrice + actualPaymentAmount,
        verifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        addTotalProductPrice: deleteField(),
        addTotalQuantity: deleteField(),
        orderDates: [
          ...existingOrderDates,
          {
            type: 'additional',
            createdAt: serverTimestamp(),
            paymentId: currentPaymentId || ''
          }
        ]
      }

      // actualPaymentAmount가 0보다 클 때만 paymentInfo, paymentId 저장
      if (actualPaymentAmount > 0) {
        updateData.paymentInfo = paymentInfoArray
        updateData.paymentId = paymentIdArray
      }

      await updateDoc(orderRef, updateData)

      console.log('✅ 추가 주문 결제 완료:', {
        기존총액: currentTotalPrice,
        추가주문금액: totalPrice,
        실제결제금액: actualPaymentAmount,
        최종총액: currentTotalPrice + actualPaymentAmount
      })

      sessionStorage.removeItem('additionalOrderData')
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
      verifiedAt: serverTimestamp()
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
      const additionalItems = finalOrderData.items.filter((item: OrderItem) => item.isAddItem === true)
      additionalQuantity = additionalItems.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0)
      additionalProductPrice = additionalItems.reduce((sum: number, item: OrderItem) => sum + (item.itemPrice || 0), 0)
    }

    await sendOrderAlimtalk({
      partnerPhone: storeData?.phone,
      customerPhone: orderInfo.phone,
      isAdditionalOrder,
      storeName: orderData.storeName || '',
      orderNumber,
      totalQuantity,
      totalProductPrice: finalTotalProductPrice,
      additionalQuantity,
      additionalProductPrice,
    })
  } catch (alimtalkError) {
    console.error('알림톡 발송 실패:', alimtalkError)
  }

  // PC 결제 완료 후 localStorage도 정리
  localStorage.removeItem('pendingOrderData')
  sessionStorage.removeItem('pendingOrderData')
  sessionStorage.removeItem('orderData')
  alert(`결제가 완료되었습니다!\n주문번호: ${orderNumber}`)
  onRouter('/orders')

  return true
}
