'use client'

import { useState } from 'react'
import MainTitle from './home/MainTitle'
import Banner from './home/Banner'
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

      {/* 메인 컨텐츠 영역 */}
      <main className={styles.main}>        
          <MainTitle />

          {/* 카테고리 선택 */}
          <div>
            <CategorySelector
              selectedCategories={selectedCategories}
              onCategorySelect={handleCategorySelect}
            />
          </div>

          {/* 배너 */}
          <Banner />

          {/* 레스토랑 리스트 */}
          <StoreList selectedCategory="전체" />
      </main>
    </div>
  )
}