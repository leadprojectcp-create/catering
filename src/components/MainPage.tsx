'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import MainTitle from './home/MainTitle'
import Banner from './home/Banner'
import StoreList from './home/StoreList'
import CategorySelector from './home/CategorySelector'
import AIRecommendedSection from './home/AIRecommendedSection'
import Loading from './Loading'
import styles from './MainPage.module.css'

export default function MainPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const { user, userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 로그인한 사용자 중 회원가입이 완료되지 않은 경우
    if (!loading && user && userData && !userData.registrationComplete) {
      console.log('[MainPage] 가입 미완료 사용자 - /signup/choose-type으로 리다이렉트')
      router.push('/signup/choose-type')
    }
  }, [user, userData, loading, router])

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

  // 로딩 중이거나 가입 미완료 사용자면 로딩 표시
  if (loading || (user && userData && !userData.registrationComplete)) {
    return <Loading />
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

          {/* AI 추천 특별 기획전 섹션 */}
          <AIRecommendedSection />

          {/* 레스토랑 리스트 */}
          <StoreList selectedCategory="전체" />
      </main>
    </div>
  )
}