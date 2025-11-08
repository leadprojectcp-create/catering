'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getAICategoryById } from '@/lib/services/aiCategoryService'
import type { AIRecommendedCategory } from '@/lib/services/aiCategoryService'
import OptimizedImage from '@/components/common/OptimizedImage'
import Loading from '@/components/Loading'
import styles from './AICategoryProductList.module.css'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  discountedPrice?: number
  discount?: {
    discountAmount: number
    discountPercent: number
    startDate?: string | null
    endDate?: string | null
    isAlwaysActive?: boolean
  }
  images?: string[]
  storeId: string
  storeName?: string
  category?: string[]
  status?: string
  averageRating?: number
  reviewCount?: number
}

interface Props {
  categoryId: string
}

export default function AICategoryProductList({ categoryId }: Props) {
  const router = useRouter()
  const [category, setCategory] = useState<AIRecommendedCategory | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // 할인 기간이 유효한지 체크
  const isDiscountValid = (product: Product) => {
    if (
      !product.discount ||
      !product.discount.discountPercent ||
      product.discount.discountPercent <= 0
    ) {
      return false
    }

    if (!product.discount.startDate || !product.discount.endDate) {
      return true
    }

    const now = new Date()
    const startDate = new Date(product.discount.startDate)
    const endDate = new Date(product.discount.endDate)

    return now >= startDate && now <= endDate
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. AI 카테고리 정보 가져오기
        const categoryData = await getAICategoryById(categoryId)
        if (!categoryData) {
          console.error('카테고리를 찾을 수 없습니다.')
          return
        }
        setCategory(categoryData)

        // 2. 카테고리에 포함된 상품들 가져오기
        if (categoryData.productIds.length === 0) {
          setProducts([])
          return
        }

        const productPromises = categoryData.productIds.map(async (productId) => {
          const productDoc = await getDoc(doc(db, 'products', productId))
          if (!productDoc.exists()) return null

          const productData = productDoc.data()

          // 가게 정보 가져오기
          let storeName = ''
          if (productData.storeId) {
            const storeDoc = await getDoc(doc(db, 'stores', productData.storeId))
            if (storeDoc.exists()) {
              storeName = storeDoc.data().storeName || ''
            }
          }

          return {
            id: productDoc.id,
            ...productData,
            storeName,
          } as Product
        })

        const productsData = await Promise.all(productPromises)
        const validProducts = productsData.filter(
          (p): p is Product => p !== null && p.status === 'active'
        )

        setProducts(validProducts)
      } catch (error) {
        console.error('데이터 로딩 에러:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [categoryId])

  // 검색 필터링
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [products, searchQuery])

  const handleProductClick = (product: Product) => {
    router.push(`/product/${product.id}`)
  }

  if (isLoading) {
    return <Loading />
  }

  if (!category) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>카테고리를 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 배너 이미지 */}
      <div className={styles.banner}>
        <OptimizedImage
          src={category.imageUrl}
          alt={category.name}
          width={1200}
          height={400}
          className={styles.bannerImage}
        />
        <div className={styles.bannerOverlay}>
          <h1>{category.name}</h1>
          <p>{category.description}</p>
        </div>
      </div>

      {/* 검색 바 */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="상품 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.productCount}>
          {filteredProducts.length}개의 상품
        </div>
      </div>

      {/* 상품 목록 */}
      {filteredProducts.length === 0 ? (
        <div className={styles.emptyState}>
          {searchQuery ? '검색 결과가 없습니다.' : '상품이 없습니다.'}
        </div>
      ) : (
        <div className={styles.productGrid}>
          {filteredProducts.map((product) => {
            const validDiscount = isDiscountValid(product)
            const finalPrice = validDiscount
              ? product.discountedPrice || product.price
              : product.price

            return (
              <div
                key={product.id}
                className={styles.productCard}
                onClick={() => handleProductClick(product)}
              >
                <div className={styles.imageWrapper}>
                  {product.images && product.images.length > 0 ? (
                    <OptimizedImage
                      src={product.images[0]}
                      alt={product.name}
                      width={300}
                      height={300}
                      className={styles.productImage}
                    />
                  ) : (
                    <div className={styles.noImage}>이미지 없음</div>
                  )}
                  {validDiscount && product.discount && (
                    <div className={styles.discountBadge}>
                      {product.discount.discountPercent}% OFF
                    </div>
                  )}
                </div>

                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  {product.storeName && (
                    <p className={styles.storeName}>{product.storeName}</p>
                  )}

                  <div className={styles.priceSection}>
                    {validDiscount && product.discount ? (
                      <>
                        <span className={styles.originalPrice}>
                          {product.price.toLocaleString()}원
                        </span>
                        <span className={styles.discountedPrice}>
                          {finalPrice.toLocaleString()}원
                        </span>
                      </>
                    ) : (
                      <span className={styles.price}>
                        {product.price.toLocaleString()}원
                      </span>
                    )}
                  </div>

                  {product.reviewCount !== undefined &&
                    product.reviewCount > 0 && (
                      <div className={styles.rating}>
                        ⭐ {product.averageRating?.toFixed(1) || 0} (
                        {product.reviewCount})
                      </div>
                    )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
