'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getActiveAICategories } from '@/lib/services/aiCategoryService'
import type { AIRecommendedCategory } from '@/lib/services/aiCategoryService'
import OptimizedImage from '@/components/common/OptimizedImage'
import styles from './AIRecommendedSection.module.css'

export default function AIRecommendedSection() {
  const router = useRouter()
  const [categories, setCategories] = useState<AIRecommendedCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getActiveAICategories()
        setCategories(data)
      } catch (error) {
        console.error('AI 카테고리 로딩 에러:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 카테고리가 없으면 렌더링하지 않음
  if (isLoading || categories.length === 0) {
    return null
  }

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/ai-category/${categoryId}`)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(categories.length - 1, prev + 1))
  }

  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < categories.length - 1

  // 슬라이드 이동 거리 계산 (카드 너비 + gap)
  const slideDistance = isMobile ? 180 + 8 : 290 + 16

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>🎯 단모 pick</h2>
      </div>

      <div className={styles.sliderContainer}>
        {canGoPrev && (
          <button
            className={`${styles.arrowButton} ${styles.arrowLeft}`}
            onClick={handlePrev}
            aria-label="이전"
          >
            ←
          </button>
        )}

        <div className={styles.sliderWrapper}>
          <div
            ref={sliderRef}
            className={styles.slider}
            style={!isMobile ? {
              transform: `translateX(-${currentIndex * slideDistance}px)`,
            } : undefined}
          >
            {categories.map((category) => (
              <div
                key={category.id}
                className={styles.categoryCard}
                onClick={() => handleCategoryClick(category.id!)}
              >
                <div className={styles.imageWrapper}>
                  <OptimizedImage
                    src={category.imageUrl}
                    alt={category.name}
                    width={290}
                    height={340}
                    className={styles.image}
                  />
                  <div className={styles.overlay}>
                    <div className={styles.textContent}>
                      <p className={styles.description}>{category.description}</p>
                      <h3 className={styles.name}>{category.name}</h3>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {canGoNext && (
          <button
            className={`${styles.arrowButton} ${styles.arrowRight}`}
            onClick={handleNext}
            aria-label="다음"
          >
            →
          </button>
        )}
      </div>
    </section>
  )
}
