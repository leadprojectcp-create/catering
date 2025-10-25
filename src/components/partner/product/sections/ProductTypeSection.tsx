import React from 'react'
import styles from '../AddProductPage.module.css'

interface ProductTypeSectionProps {
  productTypes: string[]
  onChange: (productTypes: string[]) => void
}

export default function ProductTypeSection({ productTypes, onChange }: ProductTypeSectionProps) {
  const handleTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      onChange([type])
    } else {
      onChange([])
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>3</span>
        <span className={styles.sectionTitle}>상품 타입 설정</span>
        <span className={styles.optionalLabel}>(선택사항, 상품별 1개만 선택가능)</span>
      </div>
      <div className={styles.checkboxGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={productTypes.includes('대표상품')}
            onChange={(e) => handleTypeChange('대표상품', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={productTypes.includes('대표상품') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          대표상품
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={productTypes.includes('추천상품')}
            onChange={(e) => handleTypeChange('추천상품', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={productTypes.includes('추천상품') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          추천상품
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={productTypes.includes('시즌상품')}
            onChange={(e) => handleTypeChange('시즌상품', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={productTypes.includes('시즌상품') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          시즌상품
        </label>
      </div>
    </div>
  )
}
