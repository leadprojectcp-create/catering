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
                <h3 className={styles.productName}>{product.name}</h3>

                {/* 가격 정보 */}
                {product.discount && product.discountedPrice && product.discount.discountPercent > 0 ? (
                  <>
                    <span className={styles.originalPrice}>{product.price.toLocaleString()}원</span>
                    <div className={styles.discountRow}>
                      <span className={styles.discountedPrice}>{product.discountedPrice?.toLocaleString()}원</span>
                      <span className={styles.discountPercent}>{product.discount.discountPercent}%</span>
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

                {/* 최소 주문일 정보 */}
                {product.minOrderDays && product.minOrderDays > 0 && (
                  <div className={styles.minOrderDays}>
                    최소 {product.minOrderDays}일 전 주문 가능
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
