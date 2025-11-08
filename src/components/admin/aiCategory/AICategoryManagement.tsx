'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getAllAICategories,
  deleteAICategory,
  toggleAICategoryActive,
} from '@/lib/services/aiCategoryService'
import type { AIRecommendedCategory } from '@/lib/services/aiCategoryService'
import OptimizedImage from '@/components/common/OptimizedImage'
import Loading from '@/components/Loading'
import styles from './AICategoryManagement.module.css'

export default function AICategoryManagement() {
  const router = useRouter()
  const [categories, setCategories] = useState<AIRecommendedCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const data = await getAllAICategories()
      setCategories(data)
    } catch (error) {
      console.error('카테고리 로딩 에러:', error)
      alert('카테고리를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (
    categoryId: string,
    currentActive: boolean
  ) => {
    if (
      !confirm(
        `이 카테고리를 ${currentActive ? '비활성화' : '활성화'}하시겠습니까?`
      )
    ) {
      return
    }

    try {
      await toggleAICategoryActive(categoryId, !currentActive)
      await fetchCategories() // 새로고침
      alert('상태가 변경되었습니다.')
    } catch (error) {
      console.error('활성화 토글 에러:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (
      !confirm(
        `"${categoryName}" 카테고리를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return
    }

    try {
      await deleteAICategory(categoryId)
      await fetchCategories() // 새로고침
      alert('카테고리가 삭제되었습니다.')
    } catch (error) {
      console.error('삭제 에러:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleCreateNew = () => {
    router.push('/admin/ai-category')
  }

  const handleViewCategory = (categoryId: string) => {
    router.push(`/ai-category/${categoryId}`)
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>AI 추천 카테고리 관리</h1>
          <p>생성된 AI 추천 카테고리를 관리합니다.</p>
        </div>
        <button onClick={handleCreateNew} className={styles.createButton}>
          + 새 카테고리 만들기
        </button>
      </div>

      {categories.length === 0 ? (
        <div className={styles.emptyState}>
          <p>생성된 AI 추천 카테고리가 없습니다.</p>
          <button onClick={handleCreateNew} className={styles.createButton}>
            첫 번째 카테고리 만들기
          </button>
        </div>
      ) : (
        <div className={styles.categoryList}>
          {categories.map((category) => (
            <div key={category.id} className={styles.categoryCard}>
              <div className={styles.imageSection}>
                <OptimizedImage
                  src={category.imageUrl}
                  alt={category.name}
                  width={300}
                  height={100}
                  className={styles.categoryImage}
                />
              </div>

              <div className={styles.infoSection}>
                <div className={styles.mainInfo}>
                  <h3>{category.name}</h3>
                  <p className={styles.description}>{category.description}</p>
                  <p className={styles.prompt}>
                    <strong>프롬프트:</strong> {category.prompt}
                  </p>
                  <div className={styles.meta}>
                    <span>상품 {category.productIds.length}개</span>
                    <span>•</span>
                    <span>순서: {category.displayOrder}</span>
                    <span>•</span>
                    <span
                      className={
                        category.isActive ? styles.active : styles.inactive
                      }
                    >
                      {category.isActive ? '활성화' : '비활성화'}
                    </span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    onClick={() => handleViewCategory(category.id!)}
                    className={styles.viewButton}
                  >
                    상품 보기
                  </button>
                  <button
                    onClick={() =>
                      handleToggleActive(category.id!, category.isActive)
                    }
                    className={styles.toggleButton}
                  >
                    {category.isActive ? '비활성화' : '활성화'}
                  </button>
                  <button
                    onClick={() => handleDelete(category.id!, category.name)}
                    className={styles.deleteButton}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
