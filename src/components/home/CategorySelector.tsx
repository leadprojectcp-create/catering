'use client'

import Image from 'next/image'
import styles from './CategorySelector.module.css'

interface CategoryOption {
  id: string
  name: string
  icon: string
}

const categories: CategoryOption[] = [
  { id: 'dessert', name: '디저트', icon: '/icons/dessert_box.png' },
  { id: 'sandwich', name: '샌드위치', icon: '/icons/sandwich_bakery.png' },
  { id: 'salad', name: '샐러드/과일', icon: '/icons/salad_fruit.png' },
  { id: 'kimbap', name: '김밥', icon: '/icons/kimbap_korean.png' },
  { id: 'lunchbox', name: '도시락', icon: '/icons/dosilak.png' },
  { id: 'traditional', name: '떡/전통한과', icon: '/icons/ricecake_traditional.png' },
  { id: 'gift', name: '답례품', icon: '/icons/gift.png' },
  { id: 'delivery', name: '당일배송', icon: '/icons/delivery.png' },
  { id: 'ai', name: 'AI추천', icon: '/icons/ai_recommendation.png' }
]

interface CategorySelectorProps {
  selectedCategories: string[]
  onCategorySelect: (categoryId: string) => void
}

export default function CategorySelector({
  selectedCategories,
  onCategorySelect
}: CategorySelectorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.categoryGrid}>
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category.id)

          return (
            <button
              key={category.id}
              type="button"
              className={`${styles.categoryCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => onCategorySelect(category.id)}
            >
              <div className={styles.categoryIcon}>
                <Image
                  src={category.icon}
                  alt={category.name}
                  width={44}
                  height={44}
                />
              </div>
              <div className={styles.categoryName}>{category.name}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { categories }
export type { CategoryOption }