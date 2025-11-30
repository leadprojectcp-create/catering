import React from 'react'
import CustomEditor from '@/components/common/CustomEditor'
import styles from './DescriptionSection.module.css'

interface DescriptionSectionProps {
  description: string
  onChange: (description: string) => void
  storeId: string | undefined
  productId: string
}

export default function DescriptionSection({ description, onChange, storeId, productId }: DescriptionSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>10</span>
        <span className={styles.sectionTitle}>상품설명 작성</span>
      </div>
      <CustomEditor
        value={description}
        onChange={onChange}
        placeholder="상품에 대한 상세한 설명을 입력하세요"
        storeId={storeId}
        productId={productId}
      />
    </div>
  )
}
