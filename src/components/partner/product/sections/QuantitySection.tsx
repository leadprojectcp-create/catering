import React from 'react'
import styles from './QuantitySection.module.css'

interface QuantitySectionProps {
  minOrderQuantity: number
  maxOrderQuantity: number
  onChange: (data: { minOrderQuantity?: number; maxOrderQuantity?: number }) => void
}

export default function QuantitySection({ minOrderQuantity, maxOrderQuantity, onChange }: QuantitySectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>6</span>
        <span className={styles.sectionTitle}>상품 수량 설정</span>
      </div>
      <div className={styles.quantityGrid}>
        <div className={styles.quantityGroup}>
          <label className={styles.sectionTitle}>최소 수량</label>
          <div className={styles.inputWithUnit}>
            <input
              type="number"
              value={minOrderQuantity}
              onChange={(e) => onChange({ minOrderQuantity: Number(e.target.value) })}
              onBlur={(e) => {
                const value = Number(e.target.value)
                if (value < 10) {
                  alert('최소 주문수량은 10개 이상이어야 합니다.')
                  onChange({ minOrderQuantity: 10 })
                }
              }}
              min="10"
              className={styles.textInput}
            />
            <span className={styles.inputUnit}>개</span>
          </div>
        </div>
        <div className={styles.quantityGroup}>
          <label className={styles.sectionTitle}>최대 수량</label>
          <div className={styles.inputWithUnit}>
            <input
              type="number"
              value={maxOrderQuantity}
              onChange={(e) => onChange({ maxOrderQuantity: Number(e.target.value) })}
              min="11"
              className={styles.textInput}
            />
            <span className={styles.inputUnit}>개</span>
          </div>
        </div>
      </div>
    </div>
  )
}
