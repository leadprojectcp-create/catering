'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getActiveAICategories } from '@/lib/services/aiCategoryService'
import type { AIRecommendedCategory } from '@/lib/services/aiCategoryService'
import OptimizedImage from '@/components/common/OptimizedImage'
import styles from './AIRecommendedSection.module.css'

export default function AIRecommendedSection() {
  const router = useRouter()
  const [categories, setCategories] = useState<AIRecommendedCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  // 카테고리가 없으면 렌더링하지 않음
  if (isLoading || categories.length === 0) {
    return null
  }

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/ai-category/${categoryId}`)
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>🎯 지금 HOT한 특별 기획전</h2>
        <p>AI가 엄선한 특별한 상품들을 만나보세요</p>
      </div>

      <div className={styles.categoryGrid}>
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
                width={600}
                height={200}
                className={styles.image}
              />
              <div className={styles.overlay}>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
