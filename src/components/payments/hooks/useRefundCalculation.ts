import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { OrderData } from '../types'

interface UseRefundCalculationParams {
  isAdditionalOrder: boolean
  orderId: string | null
  orderData: OrderData | null
  totalProductPrice: number
}

interface RefundCalculationResult {
  deliveryFeeRefund: number
  expectedPointReward: number
}

/**
 * 추가 주문 시 배송비 환급 및 포인트 적립 계산
 */
export function useRefundCalculation({
  isAdditionalOrder,
  orderId,
  orderData,
  totalProductPrice
}: UseRefundCalculationParams): RefundCalculationResult {
  const [deliveryFeeRefund, setDeliveryFeeRefund] = useState(0)
  const [expectedPointReward, setExpectedPointReward] = useState(0)

  useEffect(() => {
    const calculateRefund = async () => {
      if (!isAdditionalOrder || !orderId || !orderData) {
        setDeliveryFeeRefund(0)
        setExpectedPointReward(0)
        return
      }

      try {
        // 기존 주문 정보 가져오기
        const orderDocRef = doc(db, 'orders', orderId)
        const orderDocSnap = await getDoc(orderDocRef)

        if (!orderDocSnap.exists()) {
          setDeliveryFeeRefund(0)
          setExpectedPointReward(0)
          return
        }

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
        setDeliveryFeeRefund(0)
        setExpectedPointReward(0)
      }
    }

    calculateRefund()
  }, [isAdditionalOrder, orderId, orderData, totalProductPrice])

  return {
    deliveryFeeRefund,
    expectedPointReward
  }
}
