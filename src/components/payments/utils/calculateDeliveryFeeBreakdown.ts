export interface DeliveryFeeBreakdown {
  totalFee: number          // 실제 총 배송비
  customerFee: number       // 고객 부담 배송비
  storeFee: number          // 가게 부담 배송비
  feeType: string          // 배송비 타입
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

/**
 * 배송비를 고객 부담과 가게 부담으로 분리 계산
 */
export function calculateDeliveryFeeBreakdown(
  deliveryMethod: string,
  deliveryFeeSettings: DeliveryFeeSettings | null,
  quickDeliveryFeeSettings: QuickDeliveryFeeSettings | null,
  actualQuickFee: number,
  totalProductPrice: number,
  totalQuantity: number
): DeliveryFeeBreakdown {

  // 택배 배송
  if (deliveryMethod === '택배 배송' && deliveryFeeSettings) {
    const settings = deliveryFeeSettings

    switch (settings.type) {
      case '무료':
        return {
          totalFee: settings.baseFee || 0,
          customerFee: 0,
          storeFee: settings.baseFee || 0,
          feeType: '무료'
        }

      case '유료':
        return {
          totalFee: settings.baseFee || 0,
          customerFee: settings.baseFee || 0,
          storeFee: 0,
          feeType: '유료'
        }

      case '조건부 무료':
        const conditionMet = totalProductPrice >= (settings.freeCondition || 0)
        const fee = conditionMet ? 0 : (settings.baseFee || 0)
        return {
          totalFee: settings.baseFee || 0,
          customerFee: fee,
          storeFee: conditionMet ? (settings.baseFee || 0) : 0,
          feeType: '조건부 무료'
        }

      case '수량별':
        const quantityFee = Math.ceil(totalQuantity / (settings.perQuantity || 10)) * (settings.baseFee || 0)
        return {
          totalFee: quantityFee,
          customerFee: quantityFee,
          storeFee: 0,
          feeType: '수량별'
        }

      default:
        return {
          totalFee: 0,
          customerFee: 0,
          storeFee: 0,
          feeType: '알 수 없음'
        }
    }
  }

  // 퀵업체 배송
  if (deliveryMethod === '퀵업체 배송' && quickDeliveryFeeSettings) {
    const settings = quickDeliveryFeeSettings

    switch (settings.type) {
      case '무료':
        return {
          totalFee: actualQuickFee,
          customerFee: 0,
          storeFee: actualQuickFee,
          feeType: '무료'
        }

      case '유료':
        return {
          totalFee: actualQuickFee,
          customerFee: actualQuickFee,
          storeFee: 0,
          feeType: '유료'
        }

      case '조건부 지원':
        const conditionMet = totalProductPrice >= (settings.freeCondition || 0)
        if (conditionMet) {
          const supportAmount = settings.maxSupport || 0
          const customerPays = Math.max(0, actualQuickFee - supportAmount)
          return {
            totalFee: actualQuickFee,
            customerFee: customerPays,
            storeFee: supportAmount,
            feeType: '조건부 지원'
          }
        } else {
          return {
            totalFee: actualQuickFee,
            customerFee: actualQuickFee,
            storeFee: 0,
            feeType: '조건부 지원'
          }
        }

      default:
        return {
          totalFee: 0,
          customerFee: 0,
          storeFee: 0,
          feeType: '알 수 없음'
        }
    }
  }

  // 매장 픽업
  return {
    totalFee: 0,
    customerFee: 0,
    storeFee: 0,
    feeType: '매장 픽업'
  }
}
