import React from 'react'
import Image from 'next/image'
import { categories } from '../common/types/types'
import styles from './CategorySection.module.css'

interface CategorySectionProps {
  categories: string[]
  onChange: (categories: string[]) => void
}

export default function CategorySection({ categories: selectedCategories, onChange }: CategorySectionProps) {
  const handleCategoryClick = (categoryName: string) => {
    const isSelected = selectedCategories.includes(categoryName)

    if (isSelected) {
      // 이미 선택된 경우 제거
      onChange(selectedCategories.filter(cat => cat !== categoryName))
    } else {
      // 선택되지 않은 경우
      if (selectedCategories.length >= 2) {
        alert('카테고리는 최대 2개까지 선택 가능합니다.')
        return
      }
      // 추가 (최대 2개)
      onChange([...selectedCategories, categoryName])
    }
  }

  // "답례품" 체크박스 처리
  const handleGiftCheckbox = (checked: boolean) => {
    handleCategoryClick('답례품')
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>4</span>
        <span className={styles.sectionTitle}>카테고리</span>
        <span className={styles.optionalLabel}>(카테고리는 최대 2개까지 중복선택 가능)</span>
      </div>
      <div className={styles.categoryGrid}>
        {categories.map((cat) => {
          const isSelected = selectedCategories.includes(cat.name)
          return (
            <button
              key={cat.id}
              type="button"
              className={`${styles.categoryCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => handleCategoryClick(cat.name)}
            >
              <div className={styles.categoryIcon}>
                <Image
                  src={cat.icon}
                  alt={cat.name}
                  width={40}
                  height={40}
                  quality={100}
                />
              </div>
              <div className={styles.categoryName}>{cat.name}</div>
            </button>
          )
        })}
        {/* 답례품 버튼 */}
        <button
          type="button"
          className={`${styles.categoryCard} ${selectedCategories.includes('답례품') ? styles.selected : ''}`}
          onClick={() => handleCategoryClick('답례품')}
        >
          <div className={styles.categoryIcon}>
            <Image
              src="/icons/gift.png"
              alt="답례품"
              width={40}
              height={40}
              quality={100}
            />
          </div>
          <div className={styles.categoryName}>답례품</div>
        </button>
      </div>
    </div>
  )
}
