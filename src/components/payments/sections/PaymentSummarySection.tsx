'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { requestPayment } from '@/lib/services/paymentService'
import { OrderData, OrderInfo } from '../types'
import { User } from 'firebase/auth'
import { useDeliveryFeeCalculation } from '../hooks/useDeliveryFeeCalculation'
import { useDeliveryAddress } from '../hooks/useDeliveryAddress'
import { Validator } from '../utils/validation'
import { calculateTotalProductPrice, calculateTotalQuantity, calculateTotalPrice } from '../utils/orderCalculations'
import { handlePaymentProcess } from '../hooks/usePaymentHandler'
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
  paymentMethod: 'card' | 'kakaopay' | 'naverpay'
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
  paymentMethod,
  onUsePointChange,
  onDeliveryFeeFromAPIChange,
  onProcessingChange,
  onPayment
}: PaymentSummarySectionProps) {
  const router = useRouter()
  const [isLoadingDeliveryFee, setIsLoadingDeliveryFee] = useState(false)

  // 추가 결제 모드 확인
  const isAdditionalOrder = !!searchParams.get('additionalOrderId')

  // 총 상품금액과 수량 계산
  const totalProductPrice = useMemo(() =>
    calculateTotalProductPrice(orderData, isAdditionalOrder)
  , [orderData, isAdditionalOrder])

  const totalQuantity = useMemo(() =>
    calculateTotalQuantity(orderData, isAdditionalOrder)
  , [orderData, isAdditionalOrder])

  // 배송비 계산 hook 사용
  const { deliveryFee, deliveryPromotion, calculateParcelDeliveryFee } = useDeliveryFeeCalculation({
    deliveryMethod,
    deliveryFeeFromAPI,
    deliveryFeeSettings,
    parcelPaymentMethod,
    totalProductPrice,
    totalQuantity,
    isAdditionalOrder,
    orderId
  })

  // 배송비 환급 및 포인트 적립 계산 (추가 주문인 경우)
  const [deliveryFeeRefund, setDeliveryFeeRefund] = useState(0)
  const [expectedPointReward, setExpectedPointReward] = useState(0)

  // 추가 주문 시 배송비 환급 계산
  useEffect(() => {
    const calculateRefund = async () => {
      if (!isAdditionalOrder || !orderId || !orderData) return

      try {
        // 기존 주문 정보 가져오기
        const orderDocRef = doc(db, 'orders', orderId)
        const orderDocSnap = await getDoc(orderDocRef)

        if (!orderDocSnap.exists()) return

        const existingOrderData = orderDocSnap.data()
        const currentTotalProductPrice = existingOrderData?.totalProductPrice || 0
        const currentDeliveryFee = existingOrderData?.deliveryFee || 0

        // 추가 주문 후 총 상품 금액
        const newTotalProductPrice = currentTotalProductPrice + totalProductPrice

        // 가게 정보 가져오기
        const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
        const storeData = storeDoc.exists() ? storeDoc.data() : null
        const freeDeliveryThreshold = storeData?.freeDeliveryThreshold || 0

        // 배송비 무료 조건 확인
        const hadDeliveryFee = currentDeliveryFee > 0
        const meetsCondition = freeDeliveryThreshold > 0 && newTotalProductPrice >= freeDeliveryThreshold

        // 기존에 배송비를 냈고, 이제 무료 배송 조건을 달성한 경우
        if (hadDeliveryFee && meetsCondition) {
          const refund = currentDeliveryFee
          const pointAmount = Math.max(0, refund - totalProductPrice)

          setDeliveryFeeRefund(refund)
          setExpectedPointReward(pointAmount)

          console.log('🎉 무료 배송 조건 달성 예상!')
          console.log('추가 주문 금액:', totalProductPrice)
          console.log('배송비 환급:', refund)
          console.log('실제 결제 금액:', Math.max(0, totalProductPrice - refund))
          console.log('포인트 적립 예상:', pointAmount)
        } else {
          setDeliveryFeeRefund(0)
          setExpectedPointReward(0)
        }
      } catch (error) {
        console.error('배송비 환급 계산 실패:', error)
      }
    }

    calculateRefund()
  }, [isAdditionalOrder, orderId, orderData, totalProductPrice])

  // 실제 결제 금액 (배송비 환급 반영) - 음수 가능
  const actualPaymentAmount = useMemo(() => {
    if (deliveryFeeRefund > 0) {
      return totalProductPrice - deliveryFeeRefund - usePoint
    }
    return calculateTotalPrice(totalProductPrice, deliveryFee, deliveryPromotion, usePoint)
  }, [totalProductPrice, deliveryFee, deliveryPromotion, usePoint, deliveryFeeRefund])

  // 총 결제금액 (화면 표시용)
  const totalPrice = useMemo(() =>
    calculateTotalPrice(totalProductPrice, deliveryFee, deliveryPromotion, usePoint)
  , [totalProductPrice, deliveryFee, deliveryPromotion, usePoint])

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

    // 주문 정보 유효성 검사
    const orderValidationErrors = Validator.validateOrderInfo({
      orderer: orderInfo.orderer,
      phone: orderInfo.phone,
      email: userEmail,
      recipient: recipient,
      deliveryDate: orderInfo.deliveryDate,
      deliveryTime: orderInfo.deliveryTime,
      address: orderInfo.address,
      deliveryMethod: deliveryMethod
    })

    if (orderValidationErrors.length > 0) {
      alert(orderValidationErrors[0].message)
      return
    }

    // 약관 동의 확인
    const agreementError = Validator.validateAgreements(agreements)
    if (agreementError) {
      alert(agreementError.message)
      return
    }

    console.log('=== 이메일 검증 완료 ===')
    console.log('사용할 이메일:', userEmail)

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
        payMethod: paymentMethod,
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
            {totalProductPrice >= 300000 && (
              <div className={styles.paymentRow}>
                <span className={styles.paymentLabel}>배송비 프로모션</span>
                <span className={styles.promotionValue}>-10,000원</span>
              </div>
            )}
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
        {isAdditionalOrder && (
          <>
            {deliveryFeeRefund > 0 ? (
              <div className={styles.paymentRow}>
                <span className={styles.paymentLabel}>🎉 무료 배송 조건 달성! 포인트 적립</span>
                <span className={styles.promotionValue}>+{expectedPointReward.toLocaleString()}P</span>
              </div>
            ) : (
              deliveryMethod === '택배 배송' && deliveryFee !== 0 && (
                <div className={styles.paymentRow}>
                  <span className={styles.paymentLabel}>
                    {deliveryFee < 0 ? '배송비 환불' : '추가 배송비'}
                  </span>
                  <span className={deliveryFee < 0 ? styles.promotionValue : styles.paymentValue}>
                    {deliveryFee < 0 ? '' : '+'}{deliveryFee.toLocaleString()}원
                  </span>
                </div>
              )
            )}
          </>
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
          <span className={styles.finalPrice}>
            {(isAdditionalOrder && deliveryFeeRefund > 0
              ? actualPaymentAmount
              : totalPrice
            ).toLocaleString()}원
          </span>
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
    searchParams, paymentMethod, onProcessingChange
  } = props

  // 추가 주문인지 확인
  const isAdditionalOrder = !!searchParams.get('additionalOrderId')

  // 총 상품금액과 수량 계산
  const totalProductPrice = calculateTotalProductPrice(orderData, isAdditionalOrder)
  const totalQuantity = calculateTotalQuantity(orderData, isAdditionalOrder)

  // 배송비 계산 hook 사용
  const { deliveryFee, deliveryPromotion } = useDeliveryFeeCalculation({
    deliveryMethod,
    deliveryFeeFromAPI,
    deliveryFeeSettings,
    parcelPaymentMethod,
    totalProductPrice,
    totalQuantity,
    isAdditionalOrder,
    orderId
  })

  // 배송지 관리 hook
  const { saveAddress, checkDuplicateAddress } = useDeliveryAddress(user?.uid || null)

  // 총 결제금액
  const totalPrice = calculateTotalPrice(totalProductPrice, deliveryFee, deliveryPromotion, usePoint)

  // 배송비 환급 및 포인트 적립 계산 (추가 주문인 경우)
  const [deliveryFeeRefund, setDeliveryFeeRefund] = useState(0)
  const [expectedPointReward, setExpectedPointReward] = useState(0)

  // 추가 주문 시 배송비 환급 계산
  useEffect(() => {
    const calculateRefund = async () => {
      if (!isAdditionalOrder || !orderId || !orderData) return

      try {
        // 기존 주문 정보 가져오기
        const orderDocRef = doc(db, 'orders', orderId)
        const orderDocSnap = await getDoc(orderDocRef)

        if (!orderDocSnap.exists()) return

        const existingOrderData = orderDocSnap.data()
        const currentTotalProductPrice = existingOrderData?.totalProductPrice || 0
        const currentDeliveryFee = existingOrderData?.deliveryFee || 0

        // 추가 주문 후 총 상품 금액
        const newTotalProductPrice = currentTotalProductPrice + totalProductPrice

        // 가게 정보 가져오기
        const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
        const storeData = storeDoc.exists() ? storeDoc.data() : null
        const freeDeliveryThreshold = storeData?.freeDeliveryThreshold || 0

        // 배송비 무료 조건 확인
        const hadDeliveryFee = currentDeliveryFee > 0
        const meetsCondition = freeDeliveryThreshold > 0 && newTotalProductPrice >= freeDeliveryThreshold

        // 기존에 배송비를 냈고, 이제 무료 배송 조건을 달성한 경우
        if (hadDeliveryFee && meetsCondition) {
          const refund = currentDeliveryFee
          const pointAmount = Math.max(0, refund - totalProductPrice)

          setDeliveryFeeRefund(refund)
          setExpectedPointReward(pointAmount)
        } else {
          setDeliveryFeeRefund(0)
          setExpectedPointReward(0)
        }
      } catch (error) {
        console.error('배송비 환급 계산 실패:', error)
      }
    }

    calculateRefund()
  }, [isAdditionalOrder, orderId, orderData, totalProductPrice])

  // 실제 결제 금액 (배송비 환급 반영) - 음수 가능
  const actualPaymentAmount = useMemo(() => {
    if (deliveryFeeRefund > 0) {
      return totalProductPrice - deliveryFeeRefund - usePoint
    }
    return calculateTotalPrice(totalProductPrice, deliveryFee, deliveryPromotion, usePoint)
  }, [totalProductPrice, deliveryFee, deliveryPromotion, usePoint, deliveryFeeRefund])

  const handlePayment = async () => {
    // 이메일 가져오기
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

    // 주문 정보 유효성 검사
    const orderValidationErrors = Validator.validateOrderInfo({
      orderer: orderInfo.orderer,
      phone: orderInfo.phone,
      email: userEmail,
      recipient: recipient,
      deliveryDate: orderInfo.deliveryDate,
      deliveryTime: orderInfo.deliveryTime,
      address: orderInfo.address,
      deliveryMethod: deliveryMethod
    })

    if (orderValidationErrors.length > 0) {
      alert(orderValidationErrors[0].message)
      return
    }

    // 약관 동의 확인
    const agreementError = Validator.validateAgreements(agreements)
    if (agreementError) {
      alert(agreementError.message)
      return
    }

    // 퀵업체 배송 시 배송비 조회 필수 검증 (추가 주문 제외)
    if (!isAdditionalOrder && deliveryMethod === '퀵업체 배송' && !deliveryFeeFromAPI) {
      alert('퀵업체 배송을 선택하셨습니다.\n반드시 "배송비 조회" 버튼을 눌러 배송비를 확인해주세요.')
      return
    }

    try {
      onProcessingChange(true)

      await handlePaymentProcess({
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
        onRouter: (path: string) => router.push(path)
      })
    } catch (error) {
      console.error('주문 생성 실패:', error)
      alert('주문 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      onProcessingChange(false)
    }
  }

  return {
    handlePayment,
    totalPrice,
    actualPaymentAmount,
    deliveryFeeRefund,
    expectedPointReward
  }
}
