import React from 'react'
import styles from '../AddProductPage.module.css'

interface ProductNameSectionProps {
  name: string
  onChange: (name: string) => void
}

export default function ProductNameSection({ name, onChange }: ProductNameSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>2</span>
        <span className={styles.sectionTitle}>상품명</span>
      </div>
      <div className={styles.inputWithCounter}>
        <input
          type="text"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          placeholder="상품명을 입력하세요"
          maxLength={30}
          className={styles.input}
        />
        <span className={styles.inputCounter}>{name.length}/30자</span>
      </div>
    </div>
  )
}
