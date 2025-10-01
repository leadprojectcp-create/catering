'use client'

import { useState } from 'react'
import Header from './Header'
import Footer from './Footer'
import StoreList from './home/StoreList'
import CategorySelector from './home/CategorySelector'
import styles from './MainPage.module.css'

export default function MainPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const handleCategorySelect = (categoryId: string) => {
    const currentCategories = selectedCategories

    if (currentCategories.includes(categoryId)) {
      // 이미 선택된 카테고리면 해제
      setSelectedCategories(currentCategories.filter(id => id !== categoryId))
    } else {
      // 카테고리 선택 (제한 없음)
      setSelectedCategories([...currentCategories, categoryId])
    }
  }

  return (
    <div className={styles.container}>
      <Header />

      {/* 메인 컨텐츠 영역 */}
      <main className={styles.main}>
        <div className={styles.mainContent}>
          {/* 카테고리 선택 */}
          <div>
            <CategorySelector
              selectedCategories={selectedCategories}
              onCategorySelect={handleCategorySelect}
            />
          </div>

          {/* 레스토랑 리스트 */}
          <StoreList selectedCategory="전체" />
        </div>
      </main>

      <Footer />
    </div>
  )
}