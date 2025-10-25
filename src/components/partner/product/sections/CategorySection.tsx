import React from 'react'
import Image from 'next/image'
import { categories } from '../types'
import styles from '../AddProductPage.module.css'

interface CategorySectionProps {
  category: string
  onChange: (category: string) => void
}

export default function CategorySection({ category, onChange }: CategorySectionProps) {
  const handleCategoryClick = (categoryName: string) => {
    if (category === categoryName) {
      onChange('')
    } else {
      onChange(categoryName)
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>4</span>
        <span className={styles.sectionTitle}>카테고리</span>
      </div>
      <div className={styles.categoryGrid}>
        <div className={styles.categoryRowTop}>
          {categories.slice(0, 3).map((cat) => {
            const isSelected = category === cat.name
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
        </div>
        <div className={styles.categoryRowBottom}>
          {categories.slice(3, 6).map((cat) => {
            const isSelected = category === cat.name
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
        </div>
      </div>
    </div>
  )
}
