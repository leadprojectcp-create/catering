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
 * 추가 주문 시 배송비 환급 및 포인트 적립 계산 (비활성화됨)
 */
export function useRefundCalculation({
  isAdditionalOrder,
  orderId,
  orderData,
  totalProductPrice
}: UseRefundCalculationParams): RefundCalculationResult {
  // 추가 주문에서 배송비 환급 기능 제거됨
  return {
    deliveryFeeRefund: 0,
    expectedPointReward: 0
  }
}
