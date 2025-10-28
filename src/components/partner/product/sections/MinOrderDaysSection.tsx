import React from 'react'
import styles from './MinOrderDaysSection.module.css'

interface MinOrderDaysSectionProps {
  minOrderDays: number
  onChange: (minOrderDays: number) => void
}

export default function MinOrderDaysSection({ minOrderDays, onChange }: MinOrderDaysSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>13</span>
        <span className={styles.sectionTitle}>최소 주문 날짜</span>
      </div>
      <div className={styles.checkboxGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={minOrderDays === 0}
            onChange={(e) => onChange(e.target.checked ? 0 : 3)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={minOrderDays === 0 ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          당일배송 가능
        </label>
      </div>
      {minOrderDays > 0 && (
        <div className={styles.minOrderDaysInput}>
          <input
            type="number"
            value={minOrderDays}
            onChange={(e) => onChange(Number(e.target.value))}
            min="1"
            className={styles.textInput}
            required
          />
          <span className={styles.inputUnit}>일</span>
        </div>
      )}
    </div>
  )
}
