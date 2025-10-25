import React from 'react'
import styles from '../AddProductPage.module.css'

interface DeliveryMethodSectionProps {
  deliveryMethods: string[]
  onChange: (deliveryMethods: string[]) => void
}

export default function DeliveryMethodSection({ deliveryMethods, onChange }: DeliveryMethodSectionProps) {
  const handleCheckboxChange = (method: string, checked: boolean) => {
    if (checked) {
      onChange([...deliveryMethods, method])
    } else {
      onChange(deliveryMethods.filter(m => m !== method))
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>11</span>
        <span className={styles.sectionTitle}>상품 배송 설정</span>
      </div>
      <div className={styles.checkboxGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={deliveryMethods.includes('퀵업체 배송')}
            onChange={(e) => handleCheckboxChange('퀵업체 배송', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={deliveryMethods.includes('퀵업체 배송') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          퀵업체 배송
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={deliveryMethods.includes('택배 배송')}
            onChange={(e) => handleCheckboxChange('택배 배송', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={deliveryMethods.includes('택배 배송') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          택배 배송
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={deliveryMethods.includes('매장 픽업')}
            onChange={(e) => handleCheckboxChange('매장 픽업', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={deliveryMethods.includes('매장 픽업') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          매장 픽업
        </label>
      </div>
    </div>
  )
}
