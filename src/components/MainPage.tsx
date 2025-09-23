'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'
import RestaurantList from './home/RestaurantList'
import styles from './MainPage.module.css'

export default function MainPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState('전체')

  // URL에서 카테고리 파라미터 읽어오기
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category')
    if (categoryFromUrl) {
      setSelectedCategory(decodeURIComponent(categoryFromUrl))
    }
  }, [searchParams])

  // 카테고리 변경 시 URL 업데이트
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)

    if (category === '전체') {
      router.push('/')
    } else {
      router.push(`/?category=${encodeURIComponent(category)}`)
    }
  }

  return (
    <div className={styles.container}>
      <Header
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
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