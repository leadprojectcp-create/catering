'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
  { id: 'gift', name: '답례품❤️', icon: '/icons/gift.png' },
  { id: 'delivery', name: '당일배송⚡', icon: '/icons/delivery.png' },
  // { id: 'ai', name: 'AI추천', icon: '/icons/ai_recommendation.png' }, // 데이터 축적 후 활성화 예정
  { id: 'magazine', name: '단모 매거진', icon: '/icons/magazine.png' }
]

interface CategorySelectorProps {
  selectedCategories: string[]
  onCategorySelect: (categoryId: string) => void
}

export default function CategorySelector({
  selectedCategories,
  onCategorySelect
}: CategorySelectorProps) {
  const router = useRouter()

  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    // 매거진은 매거진 페이지로 이동
    if (categoryId === 'magazine') {
      router.push('/magazine')
      return
    }

    // 디저트, 샌드위치, 샐러드/과일, 김밥, 도시락, 떡/전통한과, 답례품, 당일배송은 카테고리 페이지 이동
    const navigableCategories = ['dessert', 'sandwich', 'salad', 'kimbap', 'lunchbox', 'traditional', 'gift', 'delivery']

    if (navigableCategories.includes(categoryId)) {
      // URL에 한글 카테고리명을 직접 사용
      router.push(`/category/${encodeURIComponent(categoryName)}`)
    } else {
      // 나머지는 기존 동작
      onCategorySelect(categoryId)
    }
  }

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
              onClick={() => handleCategoryClick(category.id, category.name)}
            >
              <div className={styles.categoryIcon}>
                <Image
                  src={category.icon}
                  alt={category.name}
                  width={55}
                  height={55}
                  quality={100}
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