'use client'

import OptimizedImage from '@/components/common/OptimizedImage'
import styles from './ParcelPaymentMethodSection.module.css'

interface DeliveryFeeSettings {
  type: '무료' | '유료' | '조건부 무료' | '수량별'
  baseFee?: number
  freeCondition?: number
  perQuantity?: number
  paymentMethods?: ('선결제' | '착불')[]
}

interface ParcelPaymentMethodSectionProps {
  deliveryFeeSettings: DeliveryFeeSettings
  parcelPaymentMethod: '선결제' | '착불'
  totalPrice: number
  onMethodChange: (method: '선결제' | '착불') => void
}

export default function ParcelPaymentMethodSection({
  deliveryFeeSettings,
  parcelPaymentMethod,
  totalPrice,
  onMethodChange
}: ParcelPaymentMethodSectionProps) {
  if (!deliveryFeeSettings.paymentMethods || deliveryFeeSettings.paymentMethods.length === 0) {
    return null
  }

  const getPaymentDescription = (paymentMethod: string): string => {
    switch (paymentMethod) {
      case '선결제':
        return '카드결제 시 상품금액과 함께 결제됩니다.'
      case '착불':
        return '상품 수령 후 기사님께 배송비를 결제해주세요.'
      default:
        return ''
    }
  }

  const isFreeDelivery = deliveryFeeSettings.type === '조건부 무료' && totalPrice >= (deliveryFeeSettings.freeCondition || 0)

  return (
    <div className={styles.parcelPaymentContainer}>
      <div className={styles.titleRow}>
        <h3 className={styles.parcelPaymentTitle}>배송비 결제 방식</h3>
        {deliveryFeeSettings.type === '조건부 무료' && (
          <div className={styles.feeConditionNotice}>
            <OptimizedImage src="/icons/delivery.svg" alt="배송" width={16} height={16} />
            <span>
              {isFreeDelivery
                ? `${deliveryFeeSettings.freeCondition?.toLocaleString()}원 이상 구매로 배송비 무료!`
                : `${deliveryFeeSettings.freeCondition?.toLocaleString()}원 이상 구매 시 배송비 무료`}
            </span>
          </div>
        )}
        {deliveryFeeSettings.type === '수량별' && (
          <div className={styles.feeConditionNotice}>
            <OptimizedImage src="/icons/delivery.svg" alt="배송" width={16} height={16} />
            <span>
              상품 {deliveryFeeSettings.perQuantity}개당, 배송비 {(deliveryFeeSettings.baseFee || 0).toLocaleString()}원
            </span>
          </div>
        )}
      </div>
      <div className={styles.paymentMethodContainer}>
        {deliveryFeeSettings.paymentMethods.map((method) => (
          <div
            key={method}
            className={`${styles.paymentMethodBox} ${parcelPaymentMethod === method ? styles.paymentMethodBoxSelected : ''}`}
            onClick={() => onMethodChange(method)}
          >
            <div className={styles.paymentMethodContent}>
              <span className={styles.paymentMethodName}>{method}</span>
              <div className={styles.paymentMethodDescription}>{getPaymentDescription(method)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
