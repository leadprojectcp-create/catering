import { OrderData, OrderItem } from '../types'

/**
 * 총 상품 금액 계산
 */
export function calculateTotalProductPrice(
  orderData: OrderData | null,
  isAdditionalOrder: boolean = false
): number {
  if (!orderData) return 0

  const itemsToCalculate = isAdditionalOrder
    ? orderData.items.filter(item => !item.paymentId)  // 추가 주문: paymentId 없는 것만
    : orderData.items  // 최초 주문: 전체

  return itemsToCalculate.reduce((sum, item) => {
    // itemPrice는 CartItemsSection에서 이미 추가상품 가격을 포함하여 계산됨
    const itemTotal = item.itemPrice || (orderData.productPrice * item.quantity)
    return sum + itemTotal
  }, 0)
}

/**
 * 총 수량 계산
 */
export function calculateTotalQuantity(
  orderData: OrderData | null,
  isAdditionalOrder: boolean = false
): number {
  if (!orderData) return 0

  const itemsToCalculate = isAdditionalOrder
    ? orderData.items.filter(item => !item.paymentId)  // 추가 주문: paymentId 없는 것만
    : orderData.items  // 최초 주문: 전체

  return itemsToCalculate.reduce((sum, item) => sum + item.quantity, 0)
}

/**
 * 주문 아이템 필터링
 */
export function filterOrderItems(
  items: OrderItem[],
  isAdditionalOrder: boolean,
  includeAddItems: boolean = false
): OrderItem[] {
  if (isAdditionalOrder) {
    return items.filter(item => !item.paymentId)
  }

  if (includeAddItems) {
    return items
  }

  return items.filter(item => !item.isAddItem)
}

/**
 * 총 결제 금액 계산
 */
export function calculateTotalPrice(
  totalProductPrice: number,
  deliveryFee: number,
  deliveryPromotion: number,
  usePoint: number
): number {
  return totalProductPrice + deliveryFee - deliveryPromotion - usePoint
}
