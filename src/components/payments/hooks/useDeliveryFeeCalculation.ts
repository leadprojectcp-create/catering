import { useState, useEffect, useMemo } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface DeliveryFeeSettings {
  type: '무료' | '조건부 무료' | '유료' | '수량별'
  baseFee?: number
  freeCondition?: number
  perQuantity?: number
}

interface UseDeliveryFeeCalculationProps {
  deliveryMethod: string
  deliveryFeeFromAPI: number | null
  deliveryFeeSettings: DeliveryFeeSettings | null
  totalProductPrice: number
  totalQuantity: number
  isAdditionalOrder: boolean
  orderId: string | null
}

interface ExistingOrder {
  totalProductPrice: number
  items: Array<{ quantity: number }>
}

export function useDeliveryFeeCalculation({
  deliveryMethod,
  deliveryFeeFromAPI,
  deliveryFeeSettings,
  totalProductPrice,
  totalQuantity,
  isAdditionalOrder,
  orderId
}: UseDeliveryFeeCalculationProps) {
  const [existingOrder, setExistingOrder] = useState<ExistingOrder | null>(null)

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

  // 택배 배송비 계산
  const calculateParcelDeliveryFee = useMemo(() => {
    if (!deliveryFeeSettings) return 0

    const { type, baseFee = 0, freeCondition = 0, perQuantity = 0 } = deliveryFeeSettings

    if (type === '무료') return 0

    // 조건부 무료: 추가 주문일 때는 기존 주문 금액과 합산
    if (type === '조건부 무료') {
      if (isAdditionalOrder && existingOrder) {
        const existingTotalPrice = existingOrder.totalProductPrice || 0
        const combinedPrice = existingTotalPrice + totalProductPrice

        const wasAlreadyFree = existingTotalPrice >= freeCondition
        const isNowFree = combinedPrice >= freeCondition

        if (!wasAlreadyFree && isNowFree) {
          return -baseFee
        }
        return 0
      }
      return totalProductPrice >= freeCondition ? 0 : baseFee
    }

    if (type === '유료') {
      return isAdditionalOrder ? 0 : baseFee
    }

    // 수량별
    if (type === '수량별') {
      if (perQuantity > 0) {
        if (isAdditionalOrder && existingOrder) {
          const existingTotalQuantity = existingOrder.items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) || 0
          const combinedQuantity = existingTotalQuantity + totalQuantity

          const existingTimes = existingTotalQuantity > 0 ? Math.floor((existingTotalQuantity - 1) / perQuantity) + 1 : 0
          const combinedTimes = Math.floor((combinedQuantity - 1) / perQuantity) + 1

          const additionalTimes = combinedTimes - existingTimes
          return baseFee * additionalTimes
        }
        const times = Math.floor((totalQuantity - 1) / perQuantity) + 1
        return baseFee * times
      }
      return baseFee
    }
    return 0
  }, [deliveryFeeSettings, totalProductPrice, totalQuantity, isAdditionalOrder, existingOrder])

  // 최종 배송비 계산
  const deliveryFee = useMemo(() => {
    if (deliveryMethod === '퀵업체 배송') {
      if (isAdditionalOrder) {
        return 0
      }
      return deliveryFeeFromAPI || 0
    }

    if (deliveryMethod === '택배 배송') {
      if (isAdditionalOrder) {
        if (deliveryFeeSettings?.type === '조건부 무료' || deliveryFeeSettings?.type === '수량별') {
          return calculateParcelDeliveryFee
        }
        return 0
      }

      return calculateParcelDeliveryFee
    }

    return 0
  }, [isAdditionalOrder, deliveryMethod, deliveryFeeFromAPI, calculateParcelDeliveryFee, deliveryFeeSettings])

  // 배송비 프로모션 (퀵업체 배송이고 30만원 이상일 때만 1만원 할인, 추가 주문은 제외)
  const deliveryPromotion = useMemo(() => {
    if (isAdditionalOrder) {
      return 0
    }
    return deliveryMethod === '퀵업체 배송' && deliveryFeeFromAPI && totalProductPrice >= 300000 ? 10000 : 0
  }, [isAdditionalOrder, deliveryMethod, deliveryFeeFromAPI, totalProductPrice])

  return {
    deliveryFee,
    deliveryPromotion,
    calculateParcelDeliveryFee,
    existingOrder
  }
}
