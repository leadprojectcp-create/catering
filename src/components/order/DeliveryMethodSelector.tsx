'use client'

import styles from './DeliveryMethodSelector.module.css'

interface DeliveryMethodSelectorProps {
  deliveryMethods?: string[]
  selectedMethod: string
  onMethodChange: (method: string) => void
}

export default function DeliveryMethodSelector({
  deliveryMethods,
  selectedMethod,
  onMethodChange
}: DeliveryMethodSelectorProps) {
  if (!deliveryMethods || deliveryMethods.length === 0) {
    return null
  }

  const getDeliveryDescription = (method: string): string => {
    switch (method) {
      case '매장 픽업':
        return '매장 픽업이 가능한 업체 입니다.'
      case '퀵업체 배송':
        return '배달 위치에 따라서 가격이 차등 적용됩니다.'
      default:
        return ''
    }
  }

  return (
    <div className={styles.deliverySection}>
      <h3 className={styles.deliveryTitle}>배송방법</h3>
      <div className={styles.deliveryMethodContainer}>
        {deliveryMethods.map((method, index) => {
          const description = getDeliveryDescription(method)

          return (
            <div
              key={index}
              className={`${styles.deliveryMethodBox} ${selectedMethod === method ? styles.deliveryMethodBoxSelected : ''}`}
              onClick={() => onMethodChange(method)}
            >
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
