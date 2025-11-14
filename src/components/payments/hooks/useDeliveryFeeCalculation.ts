import { useState, useEffect, useMemo } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface DeliveryPromotionConfig {
  quickDelivery: {
    enabled: boolean
    minOrderAmount: number
    discountAmount: number
    description: string
  }
}

interface DeliveryFeeSettings {
  type: '무료' | '조건부 무료' | '유료' | '수량별'
  baseFee?: number
  freeCondition?: number
  perQuantity?: number
}

interface QuickDeliveryFeeSettings {
  type: '무료' | '조건부 지원' | '유료'
  freeCondition?: number
  maxSupport?: number
}

interface UseDeliveryFeeCalculationProps {
  deliveryMethod: string
  deliveryFeeFromAPI: number | null
  deliveryFeeSettings: DeliveryFeeSettings | null
  quickDeliveryFeeSettings: QuickDeliveryFeeSettings | null
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
  quickDeliveryFeeSettings,
  totalProductPrice,
  totalQuantity,
  isAdditionalOrder,
  orderId
}: UseDeliveryFeeCalculationProps) {
  const [existingOrder, setExistingOrder] = useState<ExistingOrder | null>(null)
  const [promotionConfig, setPromotionConfig] = useState<DeliveryPromotionConfig | null>(null)

  // 배송비 프로모션 설정 불러오기
  useEffect(() => {
    const loadPromotionConfig = async () => {
      try {
        const response = await fetch('/assets/delivery-promotion.json')
        const config = await response.json()
        setPromotionConfig(config)
      } catch (error) {
        console.error('Failed to load delivery promotion config:', error)
      }
    }
    loadPromotionConfig()
  }, [])

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

      // quickDeliveryFeeSettings에 따른 배송비 계산
      if (quickDeliveryFeeSettings) {
        if (quickDeliveryFeeSettings.type === '무료') {
          return 0
        }

        if (quickDeliveryFeeSettings.type === '조건부 지원') {
          const apiFee = deliveryFeeFromAPI || 0
          const minAmount = quickDeliveryFeeSettings.freeCondition || 0
          const support = quickDeliveryFeeSettings.maxSupport || 0

          // 최소 구매 금액 조건을 만족하지 않으면 배송비 그대로
          if (totalProductPrice < minAmount) {
            return apiFee
          }

          // 조건 만족 시: maxSupport가 0이면 전액 지원 (무료)
          if (support === 0) {
            return 0
          }

          // 조건 만족 시: 지원 금액만큼 할인 (음수가 되지 않도록)
          return Math.max(0, apiFee - support)
        }

        // 유료일 때는 API에서 받은 배송비 그대로
        if (quickDeliveryFeeSettings.type === '유료') {
          return deliveryFeeFromAPI || 0
        }
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
  }, [isAdditionalOrder, deliveryMethod, deliveryFeeFromAPI, quickDeliveryFeeSettings, calculateParcelDeliveryFee, deliveryFeeSettings])

  // 배송비 프로모션 (JSON 설정 파일 기반)
  // 단, 조건부 지원일 때는 프로모션 적용 안 함 (지원금액만 할인)
  const deliveryPromotion = useMemo(() => {
    if (isAdditionalOrder) {
      return 0
    }

    // 조건부 지원일 때는 배송비 프로모션 적용 안 함
    if (deliveryMethod === '퀵업체 배송' && quickDeliveryFeeSettings?.type === '조건부 지원') {
      return 0
    }

    // JSON 설정에서 프로모션 정보 가져오기
    if (promotionConfig && deliveryMethod === '퀵업체 배송' && deliveryFeeFromAPI) {
      const { enabled, minOrderAmount, discountAmount } = promotionConfig.quickDelivery

      if (enabled && totalProductPrice >= minOrderAmount) {
        return discountAmount
      }
    }

    return 0
  }, [isAdditionalOrder, deliveryMethod, deliveryFeeFromAPI, totalProductPrice, quickDeliveryFeeSettings, promotionConfig])

  return {
    deliveryFee,
    deliveryPromotion,
    calculateParcelDeliveryFee,
    existingOrder
  }
}
