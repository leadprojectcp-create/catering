'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, addDoc, collection, increment, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { requestPayment } from '@/lib/services/paymentService'
import { OrderData, OrderInfo, DeliveryAddress } from '../types'
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

  // 추가 결제 모드 확인
  const isAdditionalOrder = searchParams.get('additionalOrderId')

  // 총 상품금액과 수량 계산 - 추가 결제 모드일 때는 pendingItems 사용
  const totalProductPrice = useMemo(() => {
    if (!orderData) return 0
    const orderDataWithPending = orderData as OrderData & { pendingItems?: typeof orderData.items }
    const itemsToCalculate = (isAdditionalOrder && orderDataWithPending.pendingItems)
      ? orderDataWithPending.pendingItems
      : orderData.items
    return itemsToCalculate.reduce((sum, item) => {
      return sum + (item.itemPrice || (orderData.productPrice * item.quantity))
    }, 0)
  }, [orderData, isAdditionalOrder])

  const totalQuantity = useMemo(() => {
    if (!orderData) return 0
    const orderDataWithPending = orderData as OrderData & { pendingItems?: typeof orderData.items }
    const itemsToCalculate = (isAdditionalOrder && orderDataWithPending.pendingItems)
      ? orderDataWithPending.pendingItems
      : orderData.items
    return itemsToCalculate.reduce((sum, item) => sum + item.quantity, 0)
  }, [orderData, isAdditionalOrder])

  // 택배 배송비 계산
  const calculateParcelDeliveryFee = useMemo(() => {
    if (!deliveryFeeSettings) return 0
    if (parcelPaymentMethod === '착불') return 0

    const { type, baseFee = 0, freeCondition = 0, perQuantity = 0 } = deliveryFeeSettings

    if (type === '무료') return 0
    if (type === '조건부 무료') {
      return totalProductPrice >= freeCondition ? 0 : baseFee
    }
    if (type === '유료') return baseFee
    if (type === '수량별') {
      if (perQuantity > 0) {
        const times = Math.ceil(totalQuantity / perQuantity)
        return baseFee * times
      }
      return baseFee
    }
    return 0
  }, [deliveryFeeSettings, parcelPaymentMethod, totalProductPrice, totalQuantity])

  // 배송비 계산
  const deliveryFee = useMemo(() => {
    if (deliveryMethod === '퀵업체 배송') {
      return deliveryFeeFromAPI || 0
    }
    if (deliveryMethod === '택배 배송') {
      return calculateParcelDeliveryFee
    }
    return 0
  }, [deliveryMethod, deliveryFeeFromAPI, calculateParcelDeliveryFee])

  // 배송비 프로모션 (퀵업체 배송이고 배송비가 조회되었을 때만 적용)
  const deliveryPromotion = useMemo(() => {
    return deliveryMethod === '퀵업체 배송' && deliveryFeeFromAPI ? 10000 : 0
  }, [deliveryMethod, deliveryFeeFromAPI])

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

      // 결제 검증 완료 - paymentInfo는 웹훅에서 처리하므로 여기서는 paymentStatus만 업데이트
      const orderRef = doc(db, 'orders', finalOrderId)
      await updateDoc(orderRef, {
        paymentStatus: 'paid',
        verifiedAt: new Date()
      })

      // 배송지 정보 저장 (퀵업체 배송 또는 택배 배송인 경우)
      if ((deliveryMethod === '퀵업체 배송' || deliveryMethod === '택배 배송') && orderInfo.address.trim() && addressName.trim()) {
        try {
          const userRef = doc(db, 'users', user.uid)
          const userDoc = await getDoc(userRef)

          if (userDoc.exists()) {
            const userData = userDoc.data()
            const existingAddresses = userData.deliveryAddresses || []

            // 동일한 배송지가 이미 있는지 확인 (주소와 상세주소로 비교)
            const isDuplicate = existingAddresses.some((addr: DeliveryAddress) =>
              addr.address === orderInfo.address &&
              addr.detailAddress === orderInfo.detailAddress
            )

            if (!isDuplicate) {
              const newAddress = {
                name: addressName, // 배송지명
                orderer: recipient, // 수령인
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
          // 배송지 저장 실패해도 결제는 완료된 상태이므로 계속 진행
        }
      }

      // 포인트 사용한 경우 처리
      if (usePoint > 0 && user) {
        try {
          // users 컬렉션에서 포인트 차감
          const userRef = doc(db, 'users', user.uid)
          await updateDoc(userRef, {
            point: increment(-usePoint)
          })

          // points 컬렉션에 포인트 사용 내역 저장
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
          // 포인트 처리 실패해도 결제는 완료된 상태이므로 계속 진행
        }
      }

      // 퀵 배송은 웹훅에서 자동으로 처리됨

      // 장바구니에서 온 경우 장바구니 삭제
      if (cartIdParam) {
        try {
          const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
          await deleteDoc(cartDocRef)
          console.log('장바구니 삭제 완료:', cartIdParam)
        } catch (cartDeleteError) {
          console.error('장바구니 삭제 실패:', cartDeleteError)
          // 장바구니 삭제 실패해도 주문은 완료된 상태이므로 계속 진행
        }
      }

      // 세션 스토리지 클리어
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
                ? '착불'
                : deliveryFeeSettings?.type === '무료'
                ? '무료'
                : deliveryFeeSettings?.type === '조건부 무료'
                ? (deliveryFee === 0 ? '조건부 무료' : `+${deliveryFee.toLocaleString()}원`)
                : `+${deliveryFee.toLocaleString()}원`}
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
        return sum + (item.itemPrice || (orderData.productPrice * item.quantity))
      }, 0)
    : 0

  const totalQuantity = orderData
    ? orderData.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0

  const deliveryFee = deliveryMethod === '퀵업체 배송'
    ? (deliveryFeeFromAPI || 0)
    : deliveryMethod === '택배 배송' && deliveryFeeSettings
    ? (() => {
        if (deliveryFeeSettings.type === '무료') return 0
        if (deliveryFeeSettings.type === '조건부 무료') {
          return totalProductPrice >= (deliveryFeeSettings.freeCondition || 0) ? 0 : (deliveryFeeSettings.baseFee || 0)
        }
        if (deliveryFeeSettings.type === '수량별') {
          return (deliveryFeeSettings.baseFee || 0) * totalQuantity
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
        // 추가 주문 - 기본 정보만 업데이트 (paymentInfo는 웹훅에서 처리)
        await updateDoc(orderDocRef, {
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

      // 결제 검증 완료 - 웹훅에서 paymentInfo를 업데이트하므로 여기서는 하지 않음
      console.log('[PaymentSummary] 결제 검증 완료. 웹훅에서 paymentInfo 업데이트됩니다.')

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
