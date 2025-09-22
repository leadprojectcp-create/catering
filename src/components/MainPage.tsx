'use client'

import { useState } from 'react'
import Header from './Header'
import Footer from './Footer'
import RestaurantList from './home/RestaurantList'
import styles from './MainPage.module.css'

export default function MainPage() {
  const [selectedCategory, setSelectedCategory] = useState('전체')

  return (
    <div className={styles.container}>
      <Header
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* 메인 컨텐츠 영역 */}
      <main className={styles.main}>
        <div className={styles.mainContent}>
          {/* 레스토랑 리스트 */}
          <RestaurantList selectedCategory={selectedCategory} />
        </div>
      </main>

      <Footer />
    </div>
  )
}