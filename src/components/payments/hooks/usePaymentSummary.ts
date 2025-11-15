import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from 'firebase/auth'
import { OrderData, OrderInfo } from '../types'
import { useDeliveryFeeCalculation } from './useDeliveryFeeCalculation'
import { useDeliveryAddress } from './useDeliveryAddress'
import { useRefundCalculation } from './useRefundCalculation'
import { Validator } from '../utils/validation'
import { calculateTotalProductPrice, calculateTotalQuantity, calculateTotalPrice } from '../utils/orderCalculations'
import { handlePaymentProcess } from './usePaymentHandler'
import { calculateDeliveryFeeBreakdown } from '../utils/calculateDeliveryFeeBreakdown'

interface UsePaymentSummaryParams {
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
    perQuantity?: number
  } | null
  quickDeliveryFeeSettings: {
    type: '무료' | '조건부 지원' | '유료'
    freeCondition?: number
    maxSupport?: number
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
  paymentType: 'card' | 'vbank' | 'trans' | 'easy'
  onUsePointChange: (point: number) => void
  onDeliveryFeeFromAPIChange: (fee: number | null) => void
  onProcessingChange: (isProcessing: boolean) => void
}

/**
 * 결제 요약 정보 및 결제 처리 로직을 관리하는 hook
 */
export function usePaymentSummary(params: UsePaymentSummaryParams) {
  const router = useRouter()
  const {
    user, deliveryMethod, deliveryFeeFromAPI, usePoint, parcelPaymentMethod,
    deliveryFeeSettings, quickDeliveryFeeSettings, orderData, orderInfo, recipient, addressName,
    deliveryRequest, detailedRequest, entranceCode, agreements, orderId,
    searchParams, paymentMethod, paymentType, onProcessingChange
  } = params

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
    quickDeliveryFeeSettings,
    totalProductPrice,
    totalQuantity,
    isAdditionalOrder,
    orderId
  })

  // 배송지 관리 hook
  const { saveAddress, checkDuplicateAddress } = useDeliveryAddress(user?.uid || null)

  // 배송비 환급 계산 hook
  const { deliveryFeeRefund, expectedPointReward } = useRefundCalculation({
    isAdditionalOrder,
    orderId,
    orderData,
    totalProductPrice
  })

  // 총 결제금액
  const totalPrice = calculateTotalPrice(totalProductPrice, deliveryFee, deliveryPromotion, usePoint, parcelPaymentMethod)

  // 실제 결제 금액 (배송비 환급 반영) - 음수 가능
  const actualPaymentAmount = useMemo(() => {
    if (deliveryFeeRefund > 0) {
      return totalProductPrice - deliveryFeeRefund - usePoint
    }
    return calculateTotalPrice(totalProductPrice, deliveryFee, deliveryPromotion, usePoint, parcelPaymentMethod)
  }, [totalProductPrice, deliveryFee, deliveryPromotion, usePoint, deliveryFeeRefund, parcelPaymentMethod])

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
      // 무료 타입일 때는 자동으로 배송비 조회
      if (quickDeliveryFeeSettings?.type === '무료') {
        try {
          onProcessingChange(true)

          // 배송비 조회 API 호출
          if (!orderData?.storeId) {
            alert('판매자 정보를 찾을 수 없습니다.')
            onProcessingChange(false)
            return
          }

          const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
          if (!storeDoc.exists()) {
            alert('판매자 정보를 찾을 수 없습니다.')
            onProcessingChange(false)
            return
          }

          const storeData = storeDoc.data()
          const startAddress = storeData?.address
            ? `${storeData.address.city || ''} ${storeData.address.district || ''} ${storeData.address.dong || ''}`.trim()
            : ''

          if (!startAddress) {
            alert('판매자 주소 정보를 찾을 수 없습니다.')
            onProcessingChange(false)
            return
          }

          const destAddress = orderInfo.address
          const reservDatetimeUp = orderInfo.deliveryDate && orderInfo.deliveryTime
            ? `${orderInfo.deliveryDate} ${orderInfo.deliveryTime}:00`
            : undefined

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

          let actualDeliveryFee = 0

          if (response.ok && result.data?.feeDetails?.feeTotal) {
            // 배송비 조회 성공 - deliveryFeeFromAPI에 설정
            const fetchedFee = result.data.feeDetails.feeTotal
            params.onDeliveryFeeFromAPIChange(fetchedFee)
            actualDeliveryFee = fetchedFee
          } else {
            alert(`배송비 조회 실패: ${result.errMsg || result.error || '알 수 없는 오류'}`)
            onProcessingChange(false)
            return
          }

          // 무료 타입이므로 실제 배송비를 DB에 저장
          // 배송비 분리 계산
          const deliveryFeeBreakdown = calculateDeliveryFeeBreakdown(
            deliveryMethod,
            deliveryFeeSettings,
            quickDeliveryFeeSettings,
            actualDeliveryFee,
            totalProductPrice,
            totalQuantity
          )

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
            parcelPaymentMethod,
            usePoint,
            totalPrice, // 무료이므로 배송비가 포함되지 않음
            totalProductPrice,
            deliveryFee: deliveryFeeBreakdown.totalFee, // 실제 총 배송비 저장
            deliveryFeeBreakdown, // 배송비 분리 정보 추가
            orderId,
            searchParams,
            paymentMethod,
            paymentType,
            saveAddress,
            checkDuplicateAddress,
            onRouter: (path: string) => router.push(path),
            quickDeliveryFeeSettings,
            deliveryFeeSettings
          })

          return // 결제 처리 완료
        } catch (error) {
          console.error('배송비 조회 에러:', error)
          alert('배송비 조회에 실패했습니다.')
          onProcessingChange(false)
          return
        }
      } else {
        // 유료, 조건부 지원일 때는 배송비 조회 필수
        alert('퀵업체 배송을 선택하셨습니다.\n반드시 "배송비 조회" 버튼을 눌러 배송비를 확인해주세요.')
        return
      }
    }

    try {
      onProcessingChange(true)

      // 배송비 분리 계산
      const deliveryFeeBreakdown = calculateDeliveryFeeBreakdown(
        deliveryMethod,
        deliveryFeeSettings,
        quickDeliveryFeeSettings,
        deliveryFeeFromAPI || 0,
        totalProductPrice,
        totalQuantity
      )

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
        parcelPaymentMethod,
        usePoint,
        totalPrice,
        totalProductPrice,
        deliveryFee: deliveryFeeBreakdown.totalFee,
        deliveryFeeBreakdown,
        orderId,
        searchParams,
        paymentMethod,
        paymentType,
        saveAddress,
        checkDuplicateAddress,
        onRouter: (path: string) => router.push(path),
        quickDeliveryFeeSettings,
        deliveryFeeSettings
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
