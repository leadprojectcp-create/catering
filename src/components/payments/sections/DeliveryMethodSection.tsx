'use client'

import OptimizedImage from '@/components/common/OptimizedImage'
import styles from './DeliveryMethodSection.module.css'

interface DeliveryMethodSectionProps {
  deliveryMethods?: string[]
  selectedMethod: string
  onMethodChange: (method: string) => void
}

export default function DeliveryMethodSection({
  deliveryMethods,
  selectedMethod,
  onMethodChange
}: DeliveryMethodSectionProps) {
  if (!deliveryMethods || deliveryMethods.length === 0) {
    return null
  }

  const getDeliveryDescription = (method: string): string => {
    switch (method) {
      case '매장 픽업':
        return '고객이 직접 매장에 픽업'
      case '퀵업체 배송':
        return '원하는 날짜와 시간에 맞춰 배송'
      case '택배 배송':
        return '원하는 날짜에 배송'
      default:
        return ''
    }
  }

  const getDeliveryIcon = (method: string): string => {
    switch (method) {
      case '매장 픽업':
        return '/icons/store_pickup.png'
      case '퀵업체 배송':
        return '/icons/quick.png'
      case '택배 배송':
        return '/icons/parcel.png'
      default:
        return '/icons/store_pickup.png'
    }
  }

  return (
    <div className={styles.deliverySection}>
      <h3 className={styles.deliveryTitle}>배송방법</h3>
      <div className={styles.deliveryMethodContainer}>
        {deliveryMethods.map((method, index) => {
          const description = getDeliveryDescription(method)
          const icon = getDeliveryIcon(method)

          return (
            <div
              key={index}
              className={`${styles.deliveryMethodBox} ${selectedMethod === method ? styles.deliveryMethodBoxSelected : ''}`}
              onClick={() => onMethodChange(method)}
            >
              <div className={styles.deliveryMethodIcon}>
                <OptimizedImage
                  src={icon}
                  alt={method}
                  width={48}
                  height={48}
                />
              </div>
              <div className={styles.deliveryMethodContent}>
                <span>{method}</span>
                <div className={styles.deliveryMethodDescription}>{description}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
