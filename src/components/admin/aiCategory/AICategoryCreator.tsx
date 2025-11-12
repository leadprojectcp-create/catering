'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createAICategory } from '@/lib/services/aiCategoryService'
import OptimizedImage from '@/components/common/OptimizedImage'
import styles from './AICategoryCreator.module.css'

interface RecommendedProduct {
  id: string
  name: string
  price: number
  category: string[]
  description: string
  imageUrl: string
  recommendationReason: string
}

export default function AICategoryCreator() {
  const { user } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>(
    []
  )
  const [summary, setSummary] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [productReasons, setProductReasons] = useState<{ [key: string]: string }>({})

  // 카테고리 정보
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [displayOrder, setDisplayOrder] = useState(0)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 1단계: AI 추천 받기
  const handleGetRecommendations = async () => {
    if (!prompt.trim()) {
      setError('프롬프트를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError('')
    setRecommendations([])
    setSummary('')

    try {
      const response = await fetch('/api/admin/ai-recommend-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'AI 추천 실패')
      }

      setRecommendations(data.products)
      setSummary(data.summary)
      setCategoryDescription(data.summary) // 자동으로 설명 채우기

      // productReasons 매핑 생성
      const reasons: { [key: string]: string } = {}
      data.products.forEach((product: RecommendedProduct) => {
        reasons[product.id] = product.recommendationReason
      })
      setProductReasons(reasons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 추천 중 오류 발생')
    } finally {
      setIsLoading(false)
    }
  }

  // 상품 선택/해제
  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  // 이미지 파일 선택
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 2단계: 카테고리 생성
  const handleCreateCategory = async () => {
    if (!user) {
      setError('로그인이 필요합니다.')
      return
    }

    if (selectedProductIds.length === 0) {
      setError('최소 1개의 상품을 선택해주세요.')
      return
    }

    if (!categoryName.trim()) {
      setError('카테고리명을 입력해주세요.')
      return
    }

    if (!imageFile) {
      setError('배너 이미지를 업로드해주세요.')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // 선택된 상품들의 추천 이유만 포함
      const selectedReasons: { [key: string]: string } = {}
      selectedProductIds.forEach(id => {
        if (productReasons[id]) {
          selectedReasons[id] = productReasons[id]
        }
      })

      await createAICategory(
        {
          name: categoryName,
          description: categoryDescription,
          productIds: selectedProductIds,
          productReasons: selectedReasons,
          createdBy: user.uid,
          prompt: prompt,
          isActive: true,
          displayOrder: displayOrder,
        },
        imageFile
      )

      setSuccess('AI 추천 카테고리가 성공적으로 생성되었습니다!')

      // 폼 초기화
      setPrompt('')
      setRecommendations([])
      setSummary('')
      setSelectedProductIds([])
      setProductReasons({})
      setCategoryName('')
      setCategoryDescription('')
      setImageFile(null)
      setImagePreview('')
      setDisplayOrder(0)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '카테고리 생성 중 오류 발생'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>AI 추천 특별 기획전 만들기</h1>
        <p>프롬프트를 입력하면 AI가 적합한 상품을 추천해줍니다.</p>
      </div>

      {/* 1️⃣ 프롬프트 입력 */}
      <section className={styles.section}>
        <h2>1️⃣ 프롬프트 입력</h2>
        <div className={styles.promptInput}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='예: "크리스마스 선물용 고급 디저트", "발렌타인데이 초콜릿 세트"'
            rows={3}
            className={styles.textarea}
          />
          <button
            onClick={handleGetRecommendations}
            disabled={isLoading || !prompt.trim()}
            className={styles.primaryButton}
          >
            {isLoading ? 'AI 분석 중...' : 'AI 추천 받기 🤖'}
          </button>
        </div>
      </section>

      {/* 오류 메시지 */}
      {error && <div className={styles.error}>{error}</div>}

      {/* 성공 메시지 */}
      {success && <div className={styles.success}>{success}</div>}

      {/* 2️⃣ AI 추천 상품 */}
      {recommendations.length > 0 && (
        <section className={styles.section}>
          <h2>2️⃣ AI 추천 상품 ({recommendations.length}개)</h2>
          {summary && <p className={styles.summary}>{summary}</p>}

          <div className={styles.productList}>
            {recommendations.map((product) => (
              <div
                key={product.id}
                className={`${styles.productCard} ${
                  selectedProductIds.includes(product.id) ? styles.selected : ''
                }`}
                onClick={() => handleToggleProduct(product.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(product.id)}
                  onChange={() => handleToggleProduct(product.id)}
                  className={styles.checkbox}
                />
                <div className={styles.productImage}>
                  {product.imageUrl ? (
                    <OptimizedImage
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="100px"
                    />
                  ) : (
                    <div className={styles.noImage}>이미지 없음</div>
                  )}
                </div>
                <div className={styles.productInfo}>
                  <h3>{product.name}</h3>
                  <p className={styles.price}>
                    {product.price.toLocaleString()}원
                  </p>
                  <p className={styles.category}>
                    {product.category.join(', ')}
                  </p>
                  <p className={styles.reason}>{product.recommendationReason}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3️⃣ 기획전 정보 입력 */}
      {selectedProductIds.length > 0 && (
        <section className={styles.section}>
          <h2>3️⃣ 기획전 정보 입력</h2>

          <div className={styles.formGroup}>
            <label>카테고리명 *</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="예: 크리스마스 특선"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>설명</label>
            <textarea
              value={categoryDescription}
              onChange={(e) => setCategoryDescription(e.target.value)}
              placeholder="카테고리 설명"
              rows={3}
              className={styles.textarea}
            />
          </div>

          <div className={styles.formGroup}>
            <label>배너 이미지 업로드 * (권장: 290x340px)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.fileInput}
            />
            {imagePreview && (
              <div className={styles.imagePreview}>
                <img src={imagePreview} alt="미리보기" />
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>노출 순서</label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              min={0}
              className={styles.input}
            />
            <small>숫자가 작을수록 먼저 표시됩니다</small>
          </div>

          <button
            onClick={handleCreateCategory}
            disabled={isLoading || !categoryName || !imageFile}
            className={styles.primaryButton}
          >
            {isLoading ? '생성 중...' : '기획전 생성하기'}
          </button>
        </section>
      )}
    </div>
  )
}
