'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, addDoc, collection, increment, serverTimestamp, deleteDoc, deleteField } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { requestPayment } from '@/lib/services/paymentService'
import { OrderData, OrderInfo, DeliveryAddress, OrderItem } from '../types'
import { User } from 'firebase/auth'
import styles from './PaymentSummarySection.module.css'

interface PaymentSummarySectionProps {
  user: User | null
  deliveryMethod: string
  deliveryFeeFromAPI: number | null
  usePoint: number
  availablePoint: number
  parcelPaymentMethod: '선결제' | '착불'
  deliveryFeeSettings: {
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    paymentMethods?: ('선결제' | '착불')[]
    perQuantity?: number
  } | null
  orderData: OrderData | null
  orderInfo: OrderInfo
  recipient: string
  addressName: string
  deliveryRequest: string
  detailedRequest: string
  entranceCode: string
  agreements: {
    privacy: boolean
    terms: boolean
    refund: boolean
    marketing: boolean
  }
  orderId: string | null
  searchParams: URLSearchParams
  onUsePointChange: (point: number) => void
  onDeliveryFeeFromAPIChange: (fee: number | null) => void
  onProcessingChange: (isProcessing: boolean) => void
  onPayment?: () => Promise<void>
}

export default function PaymentSummarySection({
  user,
  deliveryMethod,
  deliveryFeeFromAPI,
  usePoint,
  availablePoint,
  parcelPaymentMethod,
  deliveryFeeSettings,
  orderData,
  orderInfo,
  recipient,
  addressName,
  deliveryRequest,
  detailedRequest,
  entranceCode,
  agreements,
  orderId,
  searchParams,
  onUsePointChange,
  onDeliveryFeeFromAPIChange,
  onProcessingChange,
  onPayment
}: PaymentSummarySectionProps) {
  const router = useRouter()
  const [isLoadingDeliveryFee, setIsLoadingDeliveryFee] = useState(false)
  const [existingOrder, setExistingOrder] = useState<{
    totalProductPrice: number
    items: Array<{ quantity: number }>
  } | null>(null)

  // 추가 결제 모드 확인
  const isAdditionalOrder = searchParams.get('additionalOrderId')

  // 추가 주문일 때 기존 주문 정보 가져오기
  useEffect(() => {
    const fetchExistingOrder = async () => {
      if (isAdditionalOrder && orderId) {
        try {
          const orderRef = doc(db, 'orders', orderId)
          const orderDoc = await getDoc(orderRef)
          if (orderDoc.exists()) {
            const data = orderDoc.data()
            setExistingOrder({
              totalProductPrice: data.totalProductPrice || 0,
              items: data.items || []
            })
          }
        } catch (error) {
          console.error('Error fetching existing order:', error)
        }
      }
    }
    fetchExistingOrder()
  }, [isAdditionalOrder, orderId])

  // 총 상품금액과 수량 계산
  // 추가 주문 모드일 때는 paymentId가 없는 항목들(새로 추가된 것들)만 계산
  const totalProductPrice = useMemo(() => {
    if (!orderData) return 0
    const itemsToCalculate = isAdditionalOrder
      ? orderData.items.filter(item => !item.paymentId)  // 추가 주문: paymentId 없는 것만
      : orderData.items  // 최초 주문: 전체
    return itemsToCalculate.reduce((sum, item) => {
      // itemPrice는 CartItemsSection에서 이미 추가상품 가격을 포함하여 계산됨
      const itemTotal = item.itemPrice || (orderData.productPrice * item.quantity)
      return sum + itemTotal
    }, 0)
  }, [orderData, isAdditionalOrder])

  const totalQuantity = useMemo(() => {
    if (!orderData) return 0
    const itemsToCalculate = isAdditionalOrder
      ? orderData.items.filter(item => !item.paymentId)  // 추가 주문: paymentId 없는 것만
      : orderData.items  // 최초 주문: 전체
    return itemsToCalculate.reduce((sum, item) => sum + item.quantity, 0)
  }, [orderData, isAdditionalOrder])

  // 택배 배송비 계산 (착불일 경우에도 금액 계산)
  const calculateParcelDeliveryFee = useMemo(() => {
    if (!deliveryFeeSettings) return 0

    const { type, baseFee = 0, freeCondition = 0, perQuantity = 0 } = deliveryFeeSettings

    if (type === '무료') return 0

    // 조건부 무료: 추가 주문일 때는 기존 주문 금액과 합산
    if (type === '조건부 무료') {
      if (isAdditionalOrder && existingOrder) {
        const existingTotalPrice = existingOrder.totalProductPrice || 0
        const combinedPrice = existingTotalPrice + totalProductPrice

        // 기존에 이미 무료 조건을 충족했는지 확인
        const wasAlreadyFree = existingTotalPrice >= freeCondition
        // 추가 후 무료 조건을 충족하는지 확인
        const isNowFree = combinedPrice >= freeCondition

        // 기존에 무료가 아니었는데 추가 후 무료가 되면 기존 배송비를 환불 (-baseFee)
        if (!wasAlreadyFree && isNowFree) {
          return -baseFee
        }
        // 기존에도 무료였거나 추가 후에도 무료 조건 미달이면 배송비 0원
        return 0
      }
      // 최초 주문일 때
      return totalProductPrice >= freeCondition ? 0 : baseFee
    }

    if (type === '유료') {
      // 유료 배송: 최초 주문에만 배송비 부과, 추가 주문에는 없음
      return isAdditionalOrder ? 0 : baseFee
    }

    // 수량별: 추가 주문일 때는 기존 주문 수량과 합산
    if (type === '수량별') {
      if (perQuantity > 0) {
        if (isAdditionalOrder && existingOrder) {
          // 기존 주문의 총 수량 계산
          const existingTotalQuantity = existingOrder.items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) || 0
          const combinedQuantity = existingTotalQuantity + totalQuantity

          // 기존 배송비 구간
          const existingTimes = Math.ceil(existingTotalQuantity / perQuantity)
          // 추가 후 배송비 구간
          const combinedTimes = Math.ceil(combinedQuantity / perQuantity)

          // 새로운 구간에 진입했으면 그 차이만큼 배송비 부과
          const additionalTimes = combinedTimes - existingTimes
          return baseFee * additionalTimes
        }
        // 최초 주문일 때
        const times = Math.ceil(totalQuantity / perQuantity)
        return baseFee * times
      }
      return baseFee
    }
    return 0
  }, [deliveryFeeSettings, totalProductPrice, totalQuantity, isAdditionalOrder, existingOrder])

  // 배송비 계산
  const deliveryFee = useMemo(() => {
    if (deliveryMethod === '퀵업체 배송') {
      // 추가 주문일 때는 배송비 없음
      if (isAdditionalOrder) {
        return 0
      }
      return deliveryFeeFromAPI || 0
    }

    if (deliveryMethod === '택배 배송') {
      // 착불일 경우 결제 금액에 포함하지 않음
      if (parcelPaymentMethod === '착불') {
        return 0
      }

      // 추가 주문일 때: 조건부 무료와 수량별은 계산된 배송비 적용, 나머지는 0원
      if (isAdditionalOrder) {
        if (deliveryFeeSettings?.type === '조건부 무료' || deliveryFeeSettings?.type === '수량별') {
          return calculateParcelDeliveryFee
        }
        return 0
      }

      // 최초 주문일 때
      return calculateParcelDeliveryFee
    }

    return 0
  }, [isAdditionalOrder, deliveryMethod, deliveryFeeFromAPI, calculateParcelDeliveryFee, parcelPaymentMethod, deliveryFeeSettings])

  // 배송비 프로모션 (퀵업체 배송이고 30만원 이상일 때만 1만원 할인, 추가 주문은 제외)
  const deliveryPromotion = useMemo(() => {
    if (isAdditionalOrder) {
      return 0
    }
    // 퀵업체 배송이고, 배송비가 조회되었고, 상품금액이 30만원 이상일 때만 1만원 할인
    return deliveryMethod === '퀵업체 배송' && deliveryFeeFromAPI && totalProductPrice >= 300000 ? 10000 : 0
  }, [isAdditionalOrder, deliveryMethod, deliveryFeeFromAPI, totalProductPrice])

  // 총 결제금액
  const totalPrice = useMemo(() => {
    return totalProductPrice + deliveryFee - deliveryPromotion - usePoint
  }, [totalProductPrice, deliveryFee, deliveryPromotion, usePoint])

  // 결제 처리 함수
  const handlePayment = async () => {
    // 유효성 검사
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/auth/login')
      return
    }

    if (!orderData) {
      alert('주문 정보가 없습니다.')
      return
    }

    if (!orderInfo.orderer.trim()) {
      alert('주문자 이름을 입력해주세요.')
      return
    }

    if (!orderInfo.phone.trim()) {
      alert('연락처를 입력해주세요.')
      return
    }

    // 이메일이 없으면 user 객체에서 가져오기 시도
    let userEmail = orderInfo.email
    if (!userEmail || !userEmail.trim()) {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          userEmail = userDoc.data().email || ''
        }
      }
    }

    // 이메일 검증
    if (!userEmail || !userEmail.trim()) {
      alert('이메일 정보를 찾을 수 없습니다. 프로필에서 이메일을 등록해주세요.')
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userEmail)) {
      alert(`등록된 이메일 형식이 올바르지 않습니다: ${userEmail}\n프로필에서 올바른 이메일로 변경해주세요.`)
      return
    }

    console.log('=== 이메일 검증 완료 ===')
    console.log('사용할 이메일:', userEmail)

    // 퀵업체 배송일 때만 주소 검증
    if (deliveryMethod === '퀵업체 배송') {
      if (!orderInfo.address.trim()) {
        alert('주소를 입력해주세요.')
        return
      }
    }

    if (!recipient.trim()) {
      alert('수령인 이름을 입력해주세요.')
      return
    }

    if (!orderInfo.deliveryDate) {
      alert('배송 날짜를 선택해주세요.')
      return
    }

    // 택배 배송이 아닐 때만 시간 검증
    if (deliveryMethod !== '택배 배송' && !orderInfo.deliveryTime) {
      alert('배송 시간을 선택해주세요.')
      return
    }

    // 필수 약관 동의 확인
    if (!agreements.privacy || !agreements.terms || !agreements.refund || !agreements.marketing) {
      alert('필수 약관에 모두 동의해주세요.')
      return
    }

    try {
      onProcessingChange(true)

      if (!orderId) {
        alert('주문 정보가 없습니다.')
        return
      }

      // cartId로 들어온 경우 shoppingCart에서 orders로 데이터 이동
      const cartIdParam = searchParams.get('cartId')
      let finalOrderId = orderId

      if (cartIdParam) {
        // shoppingCart에서 데이터 가져오기
        const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
        const cartDocSnap = await getDoc(cartDocRef)

        if (!cartDocSnap.exists()) {
          alert('장바구니 정보를 찾을 수 없습니다.')
          return
        }

        const cartData = cartDocSnap.data()

        // orders 컬렉션에 새로운 문서 생성
        const newOrderData = {
          uid: cartData.uid,
          productId: cartData.productId,
          storeId: cartData.storeId,
          storeName: cartData.storeName,
          items: cartData.items,
          totalProductPrice: cartData.totalProductPrice,
          totalQuantity: cartData.totalQuantity,
          deliveryMethod: cartData.deliveryMethod,
          request: cartData.request,
          createdAt: cartData.createdAt || new Date(),
          updatedAt: new Date()
        }

        const newOrderRef = await addDoc(collection(db, 'orders'), newOrderData)
        finalOrderId = newOrderRef.id
        console.log('shoppingCart에서 orders로 이동 완료:', finalOrderId)
      }

      // 가게 정보 가져오기 (partnerId와 partnerPhone을 위해)
      const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
      const storeData = storeDoc.exists() ? storeDoc.data() : null

      // 주문 문서 가져오기
      const orderDocRef = doc(db, 'orders', finalOrderId)
      const orderDocSnap = await getDoc(orderDocRef)

      if (!orderDocSnap.exists()) {
        alert('주문 정보를 찾을 수 없습니다.')
        return
      }

      // 주문번호 생성
      const orderNumber = `ORD${Date.now()}`

      // 주문 문서 업데이트 (배송 정보 추가)
      await updateDoc(orderDocRef, {
        partnerId: storeData?.partnerId,
        partnerPhone: storeData?.phone,
        storeName: storeData?.storeName, // 출발지 상호명
        totalPrice: totalPrice,
        totalProductPrice: totalProductPrice,
        deliveryFee: deliveryFee,
        deliveryMethod: deliveryMethod,
        usedPoint: usePoint, // 사용한 포인트 저장
        // 배송 정보를 Map 형태로 저장
        deliveryInfo: {
          addressName: addressName, // 배송지명
          deliveryDate: orderInfo.deliveryDate,
          deliveryTime: orderInfo.deliveryTime,
          address: orderInfo.address,
          detailAddress: orderInfo.detailAddress,
          zipCode: orderInfo.zipCode || '', // 우편번호
          entrancePassword: entranceCode || '', // 공동현관 비밀번호
          recipient: recipient,
          recipientPhone: orderInfo.phone, // 받는 사람 연락처
          deliveryRequest: deliveryRequest, // 배달 요청사항 (드롭다운)
          detailedRequest: detailedRequest, // 상세요청
        },
        orderer: orderInfo.orderer,
        phone: orderInfo.phone,
        // request는 OrderPage에서 저장한 매장 요청사항이므로 유지
        orderNumber: orderNumber,
        orderStatus: 'pending',
        paymentStatus: 'unpaid',
        updatedAt: new Date()
      })

      console.log('주문 업데이트 완료:', finalOrderId, orderNumber)

      // 포트원 결제창 호출
      const paymentResult = await requestPayment({
        orderName: `${orderData.productName} ${orderData.items.length > 1 ? `외 ${orderData.items.length - 1}건` : ''}`,
        amount: totalPrice,
        orderId: finalOrderId,
        customerName: orderInfo.orderer,
        customerEmail: userEmail,
        customerPhoneNumber: orderInfo.phone,
      })

      if (!paymentResult.success) {
        alert(`결제에 실패했습니다.\n${paymentResult.errorMessage || '알 수 없는 오류'}`)
        return
      }

      // 서버에서 결제 검증
      console.log('결제 검증 시작:', paymentResult.paymentId)
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId: paymentResult.paymentId }),
      })

      const verifyData = await verifyResponse.json()
      console.log('결제 검증 결과:', verifyData)

      if (!verifyData.verified) {
        alert('결제 검증에 실패했습니다. 고객센터에 문의해주세요.')
        return
      }

      // 결제 검증 완료 (paymentInfo는 usePaymentSummary 훅에서만 저장)
      // 이 함수는 현재 사용되지 않음 - usePaymentSummary 훅을 사용
      console.log('[PaymentSummary 컴포넌트] 이 handlePayment는 사용되지 않습니다. usePaymentSummary 훅을 사용하세요.')
      alert('결제가 완료되었습니다!')
      router.push('/orders')
    } catch (error) {
      console.error('주문 생성 실패:', error)
      alert('주문 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      onProcessingChange(false)
    }
  }

  // 배송비 조회 함수
  const handleDeliveryFeeInquiry = async () => {
    if (deliveryMethod !== '퀵업체 배송') {
      alert('퀵업체 배송만 요금 조회가 가능합니다.')
      return
    }

    if (!orderInfo.address) {
      alert('배송지 주소를 먼저 입력해주세요.')
      return
    }

    if (!orderInfo.deliveryDate) {
      alert('배송 날짜를 먼저 선택해주세요.')
      return
    }

    if (!orderInfo.deliveryTime) {
      alert('배송 시간을 먼저 선택해주세요.')
      return
    }

    if (!orderData?.storeId) {
      alert('가게 정보를 찾을 수 없습니다.')
      return
    }

    setIsLoadingDeliveryFee(true)
    try {
      // 가게 정보 가져오기
      const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
      if (!storeDoc.exists()) {
        alert('가게 정보를 찾을 수 없습니다.')
        setIsLoadingDeliveryFee(false)
        return
      }

      const storeData = storeDoc.data()

      // 출발지 주소 (가게 주소)
      const startAddress = storeData?.address
        ? `${storeData.address.city || ''} ${storeData.address.district || ''} ${storeData.address.dong || ''}`.trim()
        : ''

      if (!startAddress) {
        alert('가게 주소 정보를 찾을 수 없습니다.')
        setIsLoadingDeliveryFee(false)
        return
      }

      // 도착지 주소
      const destAddress = orderInfo.address

      // 예약일시
      const reservDatetimeUp = orderInfo.deliveryDate && orderInfo.deliveryTime
        ? `${orderInfo.deliveryDate} ${orderInfo.deliveryTime}:00`
        : undefined

      console.log('[배송비 조회] 배송날짜:', orderInfo.deliveryDate)
      console.log('[배송비 조회] 배송시간:', orderInfo.deliveryTime)
      console.log('[배송비 조회] reservDatetimeUp:', reservDatetimeUp)

      const response = await fetch('/api/quick-delivery/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType: 'damas',
          startAddress,
          destAddress,
          runtype: 0,
          reservDatetimeUp,
          upWay: 'free_customer',
          downWay: 'free_customer',
          deliveryItem: {
            bgBox: 1
          }
        }),
      })

      const result = await response.json()

      if (response.ok && result.data?.feeDetails?.feeTotal) {
        onDeliveryFeeFromAPIChange(result.data.feeDetails.feeTotal)
      } else {
        alert(`배송비 조회 실패: ${result.errMsg || result.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('배송비 조회 에러:', error)
      alert('배송비 조회에 실패했습니다.')
    } finally {
      setIsLoadingDeliveryFee(false)
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>총 결제금액</h2>
      <div className={styles.paymentContainer}>
        <div className={styles.paymentRow}>
          <span className={styles.paymentLabel}>총 상품금액</span>
          <span className={styles.paymentValue}>{totalQuantity}개</span>
        </div>
        <div className={styles.paymentRow}>
          <span className={styles.paymentLabel}>총 상품금액</span>
          <span className={styles.paymentValue}>{totalProductPrice.toLocaleString()}원</span>
        </div>
        {!isAdditionalOrder && deliveryMethod === '퀵업체 배송' && !deliveryFeeFromAPI && (
          <div className={styles.paymentRow}>
            <div>
              <div className={styles.paymentLabel}>배송비</div>
              <div className={styles.deliveryFeeNotice}>
                퀵 배송 선택 시, 반드시 배송비조회를 클릭해주세요!
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeliveryFeeInquiry}
              disabled={isLoadingDeliveryFee}
              className={styles.deliveryFeeInquiryButton}
            >
              {isLoadingDeliveryFee ? '조회 중...' : '배송비 조회'}
            </button>
          </div>
        )}
        {!isAdditionalOrder && deliveryMethod === '퀵업체 배송' && deliveryFeeFromAPI && (
          <>
            <div className={styles.paymentRow}>
              <span className={styles.paymentLabel}>배송비</span>
              <span className={styles.paymentValue}>+{deliveryFee.toLocaleString()}원</span>
            </div>
            <div className={styles.paymentRow}>
              <span className={styles.paymentLabel}>배송비 프로모션</span>
              <span className={styles.promotionValue}>-10,000원</span>
            </div>
          </>
        )}
        {!isAdditionalOrder && deliveryMethod === '택배 배송' && (
          <div className={styles.paymentRow}>
            <span className={styles.paymentLabel}>배송비</span>
            <span className={styles.paymentValue}>
              {parcelPaymentMethod === '착불'
                ? `착불(${calculateParcelDeliveryFee.toLocaleString()}원)`
                : deliveryFeeSettings?.type === '무료'
                ? '무료'
                : deliveryFeeSettings?.type === '조건부 무료'
                ? (calculateParcelDeliveryFee === 0 ? '조건부 무료' : `+${calculateParcelDeliveryFee.toLocaleString()}원`)
                : `+${calculateParcelDeliveryFee.toLocaleString()}원`}
            </span>
          </div>
        )}
        {isAdditionalOrder && deliveryMethod === '택배 배송' && deliveryFee !== 0 && (
          <div className={styles.paymentRow}>
            <span className={styles.paymentLabel}>
              {deliveryFee < 0 ? '배송비 환불' : '추가 배송비'}
            </span>
            <span className={deliveryFee < 0 ? styles.promotionValue : styles.paymentValue}>
              {deliveryFee < 0 ? '' : '+'}{deliveryFee.toLocaleString()}원
            </span>
          </div>
        )}
        <div className={styles.paymentRowPoint}>
          <span className={styles.paymentLabel}>포인트</span>
          <div className={styles.pointInputContainer}>
            <div className={styles.pointInputWithPrefix}>
              <span className={styles.pointPrefix}>P</span>
              <input
                type="text"
                className={styles.pointInput}
                placeholder="0"
                value={usePoint ? usePoint.toLocaleString() : ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value.replace(/,/g, '')) || 0
                  if (value <= availablePoint && value >= 0) {
                    onUsePointChange(value)
                  } else if (e.target.value === '') {
                    onUsePointChange(0)
                  }
                }}
              />
            </div>
            <div className={styles.pointBottomRow}>
              <span className={styles.availablePoint}>사용 가능 : {availablePoint.toLocaleString()}P</span>
              <button
                type="button"
                className={styles.useAllButton}
                onClick={() => onUsePointChange(availablePoint)}
              >
                전액 사용
              </button>
            </div>
          </div>
        </div>
        <div className={styles.paymentTotal}>
          <span>총 결제금액</span>
          <span className={styles.finalPrice}>{totalPrice.toLocaleString()}원</span>
        </div>
      </div>
    </section>
  )
}

// PaymentSummarySection의 return에서 제외하고 handlePayment와 totalPrice를 노출
export type { PaymentSummarySectionProps }
export const usePaymentSummary = (props: Omit<PaymentSummarySectionProps, 'onPayment'>) => {
  const router = useRouter()
  const {
    user, deliveryMethod, deliveryFeeFromAPI, usePoint, parcelPaymentMethod,
    deliveryFeeSettings, orderData, orderInfo, recipient, addressName,
    deliveryRequest, detailedRequest, entranceCode, agreements, orderId,
    searchParams, onProcessingChange
  } = props

  const totalProductPrice = orderData
    ? orderData.items.reduce((sum, item) => {
        // itemPrice는 CartItemsSection에서 이미 추가상품 가격을 포함하여 계산됨
        const itemTotal = item.itemPrice || (orderData.productPrice * item.quantity)
        return sum + itemTotal
      }, 0)
    : 0

  const totalQuantity = orderData
    ? orderData.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0

  const deliveryFee = deliveryMethod === '퀵업체 배송'
    ? (deliveryFeeFromAPI || 0)
    : deliveryMethod === '택배 배송' && deliveryFeeSettings
    ? (() => {
        // 착불일 경우 배송비 0
        if (parcelPaymentMethod === '착불') return 0

        if (deliveryFeeSettings.type === '무료') return 0
        if (deliveryFeeSettings.type === '조건부 무료') {
          return totalProductPrice >= (deliveryFeeSettings.freeCondition || 0) ? 0 : (deliveryFeeSettings.baseFee || 0)
        }
        if (deliveryFeeSettings.type === '수량별') {
          const times = Math.ceil(totalQuantity / (deliveryFeeSettings.perQuantity || 1))
          return (deliveryFeeSettings.baseFee || 0) * times
        }
        return deliveryFeeSettings.baseFee || 0
      })()
    : 0

  const totalPrice = totalProductPrice + deliveryFee - usePoint

  const handlePayment = async () => {
    // [handlePayment 함수 내용 유지 - 너무 길어서 생략]
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/auth/login')
      return
    }

    if (!orderData) {
      alert('주문 정보가 없습니다.')
      return
    }

    if (!orderInfo.orderer.trim()) {
      alert('주문자 이름을 입력해주세요.')
      return
    }

    if (!orderInfo.phone.trim()) {
      alert('연락처를 입력해주세요.')
      return
    }

    let userEmail = orderInfo.email
    if (!userEmail || !userEmail.trim()) {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          userEmail = userDoc.data().email || ''
        }
      }
    }

    if (!userEmail || !userEmail.trim()) {
      alert('이메일 정보를 찾을 수 없습니다. 프로필에서 이메일을 등록해주세요.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userEmail)) {
      alert(`등록된 이메일 형식이 올바르지 않습니다: ${userEmail}\n프로필에서 올바른 이메일로 변경해주세요.`)
      return
    }

    console.log('=== 이메일 검증 완료 ===')
    console.log('사용할 이메일:', userEmail)

    if (deliveryMethod === '퀵업체 배송') {
      if (!orderInfo.address.trim()) {
        alert('주소를 입력해주세요.')
        return
      }
    }

    if (!recipient.trim()) {
      alert('수령인 이름을 입력해주세요.')
      return
    }

    if (!orderInfo.deliveryDate) {
      alert('배송 날짜를 선택해주세요.')
      return
    }

    if (deliveryMethod !== '택배 배송' && !orderInfo.deliveryTime) {
      alert('배송 시간을 선택해주세요.')
      return
    }

    if (!agreements.privacy || !agreements.terms || !agreements.refund || !agreements.marketing) {
      alert('필수 약관에 모두 동의해주세요.')
      return
    }

    try {
      onProcessingChange(true)

      if (!orderId) {
        alert('주문 정보가 없습니다.')
        return
      }

      const cartIdParam = searchParams.get('cartId')
      let finalOrderId = orderId
      const additionalOrderIdParam = searchParams.get('additionalOrderId')

      // 추가 주문이 아닌 경우에만 cartId 처리
      if (cartIdParam && !additionalOrderIdParam) {
        const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
        const cartDocSnap = await getDoc(cartDocRef)

        if (!cartDocSnap.exists()) {
          alert('장바구니 정보를 찾을 수 없습니다.')
          return
        }

        const cartData = cartDocSnap.data()

        // 새로운 주문 생성
        const newOrderData = {
          uid: cartData.uid,
          productId: cartData.productId,
          storeId: cartData.storeId,
          storeName: cartData.storeName,
          items: cartData.items,
          totalProductPrice: cartData.totalProductPrice,
          totalQuantity: cartData.totalQuantity,
          deliveryMethod: deliveryMethod, // props에서 가져온 deliveryMethod 사용
          request: cartData.request,
          createdAt: cartData.createdAt || new Date(),
          updatedAt: new Date()
        }

        const newOrderRef = await addDoc(collection(db, 'orders'), newOrderData)
        finalOrderId = newOrderRef.id
        console.log('shoppingCart에서 orders로 이동 완료:', finalOrderId)
      }

      const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
      const storeData = storeDoc.exists() ? storeDoc.data() : null

      const orderDocRef = doc(db, 'orders', finalOrderId)
      const orderDocSnap = await getDoc(orderDocRef)

      if (!orderDocSnap.exists()) {
        alert('주문 정보를 찾을 수 없습니다.')
        return
      }

      const orderNumber = `ORD${Date.now()}`
      const currentOrderData = orderDocSnap.data()

      if (additionalOrderIdParam) {
        // 추가 주문 - totalPrice도 누적 (paymentInfo는 웹훅에서 처리)
        const currentTotalPrice = currentOrderData?.totalPrice || 0
        await updateDoc(orderDocRef, {
          totalPrice: currentTotalPrice + totalPrice,
          updatedAt: new Date()
        })
      } else {
        // 새로운 주문 - 기본 주문 정보 저장 (paymentInfo는 웹훅에서 처리)
        await updateDoc(orderDocRef, {
          partnerId: storeData?.partnerId,
          partnerPhone: storeData?.phone,
          storeName: storeData?.storeName,
          totalPrice: totalPrice,
          totalProductPrice: totalProductPrice,
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
          paymentStatus: 'unpaid',
          updatedAt: new Date()
        })
      }

      console.log('주문 업데이트 완료:', finalOrderId, orderNumber)

      const paymentResult = await requestPayment({
        orderName: `${orderData.productName} ${orderData.items.length > 1 ? `외 ${orderData.items.length - 1}건` : ''}`,
        amount: totalPrice,
        orderId: finalOrderId,
        customerName: orderInfo.orderer,
        customerEmail: userEmail,
        customerPhoneNumber: orderInfo.phone,
      })

      if (!paymentResult.success) {
        alert(`결제에 실패했습니다.\n${paymentResult.errorMessage || '알 수 없는 오류'}`)
        return
      }

      console.log('결제 검증 시작:', paymentResult.paymentId)
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId: paymentResult.paymentId }),
      })

      const verifyData = await verifyResponse.json()
      console.log('결제 검증 결과:', verifyData)

      if (!verifyData.verified) {
        alert('결제 검증에 실패했습니다. 고객센터에 문의해주세요.')
        return
      }

      // 결제 검증 완료 - paymentInfo를 배열로 저장
      const orderRef = doc(db, 'orders', finalOrderId)

      // 기존 주문 데이터 가져오기 (추가 결제인 경우 배열에 추가)
      const orderSnapshot = await getDoc(orderRef)
      const existingOrderData = orderSnapshot.data()

      console.log('[Payment] 기존 주문 데이터:', {
        paymentInfo: existingOrderData?.paymentInfo,
        paymentId: existingOrderData?.paymentId,
        paidAt: existingOrderData?.paidAt
      })

      // 기존 배열 가져오기 또는 새 배열 생성
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

      // 새 결제 정보 추가 (paidAt은 paymentInfo 안에 포함되어 있음)
      // PortOne API의 status는 'PAID' (uppercase)이므로 lowercase로 정규화
      const normalizedPayment = {
        ...verifyData.payment,
        status: verifyData.payment.status?.toLowerCase()
      }
      paymentInfoArray.push(normalizedPayment)
      if (paymentResult.paymentId) {
        paymentIdArray.push(paymentResult.paymentId)
      }

      // 업데이트할 데이터 준비
      const updateData: Record<string, unknown> = {
        paymentStatus: 'paid',
        paymentInfo: paymentInfoArray,
        paymentId: paymentIdArray,
        verifiedAt: new Date().toISOString()
      }

      // 결제 완료 시 items에 paymentId 추가
      // 추가 주문인 경우 sessionStorage의 데이터를 기존 items에 병합
      const additionalOrderId = searchParams.get('additionalOrderId')

      let finalItems = existingOrderData?.items || []

      // 추가 주문인 경우 sessionStorage에서 추가 주문 데이터 가져와서 병합
      if (additionalOrderId) {
        const additionalDataStr = sessionStorage.getItem('additionalOrderData')
        if (additionalDataStr) {
          try {
            const additionalData = JSON.parse(additionalDataStr)
            console.log('[Payment] sessionStorage에서 추가 주문 데이터 가져옴:', additionalData)

            // 기존 items + 추가 주문 items 병합
            finalItems = [...finalItems, ...additionalData.items]

            // totalProductPrice와 totalQuantity 업데이트 (기존 값에 추가)
            const currentTotalProductPrice = existingOrderData?.totalProductPrice || 0
            const currentTotalQuantity = existingOrderData?.totalQuantity || 0

            updateData.totalProductPrice = currentTotalProductPrice + (additionalData.totalProductPrice || 0)
            updateData.totalQuantity = currentTotalQuantity + (additionalData.totalQuantity || 0)

            console.log('[Payment] totalProductPrice 업데이트:', {
              기존: currentTotalProductPrice,
              추가: additionalData.totalProductPrice,
              합계: updateData.totalProductPrice
            })
            console.log('[Payment] totalQuantity 업데이트:', {
              기존: currentTotalQuantity,
              추가: additionalData.totalQuantity,
              합계: updateData.totalQuantity
            })

            // sessionStorage 클리어
            sessionStorage.removeItem('additionalOrderData')
            console.log('[Payment] sessionStorage 클리어 완료')
          } catch (error) {
            console.error('[Payment] sessionStorage 파싱 실패:', error)
          }
        }
      }

      if (Array.isArray(finalItems) && finalItems.length > 0) {
        console.log('[Payment] items에 paymentId 추가')

        // 새로운 결제 ID (방금 완료된 결제)
        const currentPaymentId = paymentIdArray[paymentIdArray.length - 1]

        const itemsWithPaymentId = finalItems.map((item: OrderItem) => {
          // 이미 paymentId가 있으면 그대로 유지 (기존 결제 완료된 아이템)
          if (item.paymentId) {
            return item
          }
          // paymentId가 없으면 현재 결제 ID 추가
          return {
            ...item,
            paymentId: currentPaymentId,
            isAddItem: item.isAddItem ?? false  // isAddItem이 없으면 false로 설정 (기존 데이터 호환)
          }
        })

        updateData.items = itemsWithPaymentId

        // 임시 필드 삭제
        updateData.addTotalProductPrice = deleteField()
        updateData.addTotalQuantity = deleteField()

        console.log('[Payment] paymentId 추가 완료:', {
          전체_아이템수: itemsWithPaymentId.length,
          현재_결제ID: currentPaymentId,
          items: itemsWithPaymentId,
          추가주문여부: !!additionalOrderId
        })
      }

      await updateDoc(orderRef, updateData)

      if ((deliveryMethod === '퀵업체 배송' || deliveryMethod === '택배 배송') && orderInfo.address.trim() && addressName.trim()) {
        try {
          const userRef = doc(db, 'users', user.uid)
          const userDoc = await getDoc(userRef)

          if (userDoc.exists()) {
            const userData = userDoc.data()
            const existingAddresses = userData.deliveryAddresses || []

            const isDuplicate = existingAddresses.some((addr: DeliveryAddress) =>
              addr.address === orderInfo.address &&
              addr.detailAddress === orderInfo.detailAddress
            )

            if (!isDuplicate) {
              const newAddress = {
                name: addressName,
                orderer: recipient,
                phone: orderInfo.phone,
                email: userEmail,
                address: orderInfo.address,
                detailAddress: orderInfo.detailAddress,
                zipCode: orderInfo.zipCode || ''
              }

              await updateDoc(userRef, {
                deliveryAddresses: [...existingAddresses, newAddress]
              })

              console.log('배송지 저장 완료:', newAddress)
            }
          }
        } catch (addressError) {
          console.error('배송지 저장 실패:', addressError)
        }
      }

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

          console.log('포인트 사용 처리 완료:', usePoint)
        } catch (pointError) {
          console.error('포인트 사용 처리 실패:', pointError)
        }
      }

      if (cartIdParam) {
        try {
          const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
          await deleteDoc(cartDocRef)
          console.log('장바구니 삭제 완료:', cartIdParam)
        } catch (cartDeleteError) {
          console.error('장바구니 삭제 실패:', cartDeleteError)
        }
      }

      sessionStorage.removeItem('orderData')

      alert(`결제가 완료되었습니다!\n주문번호: ${orderNumber}`)
      router.push('/orders')
    } catch (error) {
      console.error('주문 생성 실패:', error)
      alert('주문 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      onProcessingChange(false)
    }
  }

  return { handlePayment, totalPrice }
}
