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
  paymentType?: 'general' | 'easy'
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
    paymentType = 'general',
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

  // 추가 주문인 경우 기존 주문 확인
  if (additionalOrderIdParam) {
    const orderDocRef = doc(db, 'orders', orderId!)
    const orderDocSnap = await getDoc(orderDocRef)

    if (!orderDocSnap.exists()) {
      alert('주문 정보를 찾을 수 없습니다.')
      return false
    }
  }

  // 포트원 결제창 호출 (결제 검증 전에는 DB에 아무것도 저장하지 않음)
  const paymentResult = await requestPayment({
    orderName: `${orderData.productName} ${orderData.items.length > 1 ? `외 ${orderData.items.length - 1}건` : ''}`,
    amount: totalPrice,
    orderId: cartIdParam || orderId || 'temp',
    customerName: orderInfo.orderer,
    customerEmail: userEmail,
    customerPhoneNumber: orderInfo.phone,
    customerUid: user?.uid,
    paymentType: paymentType,
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

  const verifyData = await verifyResponse.json()
  console.log('결제 검증 결과:', verifyData)

  if (!verifyData.verified) {
    alert('결제 검증에 실패했습니다. 고객센터에 문의해주세요.')
    return false
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

  const normalizedPayment = {
    ...verifyData.payment,
    status: verifyData.payment.status?.toLowerCase()
  }
  paymentInfoArray.push(normalizedPayment)
  if (paymentResult.paymentId) {
    paymentIdArray.push(paymentResult.paymentId)
  }

  // 장바구니에서 생성된 경우: 이미 모든 정보가 저장되어 있으므로 paymentInfo만 업데이트
  if (cartIdParam && !additionalOrderIdParam) {
    const currentPaymentId = paymentIdArray[paymentIdArray.length - 1]
    const existingItems = existingOrderData?.items || []

    const itemsWithPaymentId = existingItems.map((item: OrderItem) => ({
      ...item,
      paymentId: currentPaymentId,
      isAddItem: false
    }))

    await updateDoc(orderRef, {
      paymentInfo: paymentInfoArray,
      paymentId: paymentIdArray,
      items: itemsWithPaymentId,
      verifiedAt: new Date().toISOString()
    })
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
      const currentPaymentId = paymentIdArray[paymentIdArray.length - 1]

      const itemsWithPaymentId = newItems.map((item: OrderItem) => ({
        ...item,
        paymentId: currentPaymentId,
        isAddItem: true
      }))

      await updateDoc(orderRef, {
        paymentStatus: 'paid',
        paymentInfo: paymentInfoArray,
        paymentId: paymentIdArray,
        items: [...existingItems, ...itemsWithPaymentId],
        totalProductPrice: currentTotalProductPrice + (additionalData.totalProductPrice || 0),
        totalQuantity: currentTotalQuantity + (additionalData.totalQuantity || 0),
        totalPrice: currentTotalPrice + totalPrice,
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date(),
        addTotalProductPrice: deleteField(),
        addTotalQuantity: deleteField()
      })

      console.log('✅ 추가 주문 결제 완료:', {
        기존: currentTotalPrice,
        추가: totalPrice,
        합계: currentTotalPrice + totalPrice
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
    const currentPaymentId = paymentIdArray[paymentIdArray.length - 1]
    const existingItems = existingOrderData?.items || []

    const itemsWithPaymentId = existingItems.map((item: OrderItem) => ({
      ...item,
      paymentId: currentPaymentId,
      isAddItem: false
    }))

    await updateDoc(orderRef, {
      paymentStatus: 'paid',
      paymentInfo: paymentInfoArray,
      paymentId: paymentIdArray,
      items: itemsWithPaymentId,
      verifiedAt: new Date().toISOString()
    })
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
