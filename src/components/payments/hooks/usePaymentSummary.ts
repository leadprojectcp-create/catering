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
  paymentType: 'general' | 'easy'
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
    deliveryFeeSettings, orderData, orderInfo, recipient, addressName,
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
    parcelPaymentMethod,
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
  const totalPrice = calculateTotalPrice(totalProductPrice, deliveryFee, deliveryPromotion, usePoint)

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
