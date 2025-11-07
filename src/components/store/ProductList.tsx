'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import styles from './ProductList.module.css'

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
  category?: string
  status?: string
  minOrderQuantity?: number
  maxOrderQuantity?: number
  minOrderDays?: number
  deliveryMethods?: string[]
  additionalSettings?: string[]
  productTypes?: string[]
  quantityRanges?: {
    minQuantity: number
    maxQuantity: number
    daysBeforeOrder: number
  }[]
}

interface ProductListProps {
  storeId: string
}

type SortType = '주문많은순' | '주문적은순' | '가격낮은순' | '가격높은순' | '추천순'

export default function ProductList({ storeId }: ProductListProps) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortType, setSortType] = useState<SortType>('추천순')

  // 할인 기간이 유효한지 체크하는 함수
  const isDiscountValid = (product: Product) => {
    if (!product.discount || !product.discount.discountPercent || product.discount.discountPercent <= 0) {
      return false
    }

    // 상시 적용이거나 기간이 설정되지 않은 경우
    if (!product.discount.startDate || !product.discount.endDate) {
      return true
    }

    const now = new Date()
    const startDate = new Date(product.discount.startDate)
    const endDate = new Date(product.discount.endDate)

    // 현재 시간이 시작일과 종료일 사이에 있는지 체크
    return now >= startDate && now <= endDate
  }

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('Fetching products for storeId:', storeId)

        // 전체 상품 조회 (디버깅용)
        const allProductsQuery = query(collection(db, 'products'))
        const allProductsSnapshot = await getDocs(allProductsQuery)
        console.log('=== ALL PRODUCTS ===')
        allProductsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          console.log('Product ID:', doc.id, 'storeId:', data.storeId, 'status:', data.status, 'name:', data.name)
        })

        // 이 storeId의 상품만 조회
        const q = query(
          collection(db, 'products'),
          where('storeId', '==', storeId)
        )
        const querySnapshot = await getDocs(q)

        console.log('=== FILTERED PRODUCTS FOR THIS STORE ===')
        console.log('Total products found for storeId', storeId, ':', querySnapshot.size)

        const productData = querySnapshot.docs.map(doc => {
          const data = doc.data()
          console.log('Product:', doc.id, 'Status:', data.status, 'Name:', data.name)
          return {
            id: doc.id,
            ...data
          } as Product
        })

        // status가 'active'인 것만 필터링
        const activeProducts = productData.filter(p => p.status === 'active')
        console.log('Active products:', activeProducts.length)

        setProducts(activeProducts)
      } catch (error) {
        console.error('상품 데이터 가져오기 실패:', error)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [storeId])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>등록된 상품이 없습니다.</div>
      </div>
    )
  }

  // 정렬 함수
  const getSortedProducts = () => {
    const sorted = [...products]

    switch (sortType) {
      case '가격낮은순':
        return sorted.sort((a, b) => (a.discountedPrice || a.price) - (b.discountedPrice || b.price))
      case '가격높은순':
        return sorted.sort((a, b) => (b.discountedPrice || b.price) - (a.discountedPrice || a.price))
      case '주문많은순':
      case '주문적은순':
      case '추천순':
      default:
        return sorted
    }
  }

  const sortedProducts = getSortedProducts()

  const filterOptions: SortType[] = ['추천순', '주문많은순', '주문적은순', '가격낮은순', '가격높은순']

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>가게상품</h2>

      <div className={styles.filterContainer}>
        {filterOptions.map((option) => (
          <button
            key={option}
            className={`${styles.filterButton} ${sortType === option ? styles.filterButtonActive : ''}`}
            onClick={() => setSortType(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className={styles.productGrid}>
        {sortedProducts.map((product, index) => {
          const imageUrl = product.images && product.images.length > 0 ? product.images[0] : ''

          return (
            <React.Fragment key={product.id}>
              <div
                className={styles.card}
                onClick={() => router.push(`/productDetail/${product.id}?storeId=${storeId}`)}
              >
              <div className={styles.info}>
                <h3 className={styles.productName}>
                  {product.productTypes?.map((type, index) => {
                    const typeText = type === '대표상품' ? '대표' : type === '추천상품' ? '추천' : type === '시즌상품' ? '시즌' : type
                    const badgeClass = type === '대표상품' ? styles.productTypeFeatured :
                                      type === '추천상품' ? styles.productTypeRecommended :
                                      type === '시즌상품' ? styles.productTypeSeasonal : ''
                    return (
                      <span key={index} className={`${styles.productTypeBadge} ${badgeClass}`}>
                        {typeText}
                      </span>
                    )
                  })}
                  <span>{product.name}</span>
                </h3>

                {/* 가격 정보 */}
                {isDiscountValid(product) && product.discountedPrice ? (
                  <>
                    <span className={styles.originalPrice}>{product.price.toLocaleString()}원</span>
                    <div className={styles.discountRow}>
                      <span className={styles.discountedPrice}>{product.discountedPrice?.toLocaleString()}원</span>
                      <span className={styles.discountPercent}>{product.discount!.discountPercent}%</span>
                    </div>
                  </>
                ) : (
                  <span className={styles.regularPrice}>{product.price.toLocaleString()}원</span>
                )}

                {/* 주문 가능 수량 */}
                {product.minOrderQuantity && product.maxOrderQuantity && (
                  <div className={styles.orderQuantity}>
                    최소 {product.minOrderQuantity}개 ~ 최대 {product.maxOrderQuantity}개 주문가능
                  </div>
                )}

                {/* 주문일 정보 */}
                {product.quantityRanges && product.quantityRanges.length > 0 && !(product.quantityRanges[0].daysBeforeOrder === 0 && product.quantityRanges[product.quantityRanges.length - 1].daysBeforeOrder === 0) && (
                  <div className={styles.minOrderDays}>
                    {product.quantityRanges[0].daysBeforeOrder === product.quantityRanges[product.quantityRanges.length - 1].daysBeforeOrder
                      ? `${product.quantityRanges[0].daysBeforeOrder}일 전 주문 가능`
                      : `${product.quantityRanges[0].daysBeforeOrder}일 ~ ${product.quantityRanges[product.quantityRanges.length - 1].daysBeforeOrder}일 전 주문 가능`}
                  </div>
                )}

                {/* 추가 설정 - PC용 */}
                <div className={styles.badgeContainerDesktop}>
                  {product.additionalSettings?.map((setting, index) => (
                    <span key={index} className={styles.settingBadge}>{setting}</span>
                  ))}
                </div>
              </div>

              <div className={styles.imageWrapper}>
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className={styles.image}
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className={styles.placeholderImage}>
                    <span>이미지 없음</span>
                  </div>
                )}
              </div>

              {/* 추가 설정 - 모바일용 */}
              <div className={styles.badgeContainerMobile}>
                {product.additionalSettings?.map((setting, index) => (
                  <span key={index} className={styles.settingBadge}>{setting}</span>
                ))}
              </div>
            </div>
            {index < products.length - 1 && <div className={styles.divider}></div>}
          </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
