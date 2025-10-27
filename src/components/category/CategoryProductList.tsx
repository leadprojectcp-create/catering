'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import Loading from '@/components/Loading'
import styles from './CategoryProductList.module.css'

// 카테고리 아이콘 매핑
const categoryIcons: { [key: string]: string } = {
  '디저트': '/icons/dessert_box.png',
  '샌드위치': '/icons/sandwich_bakery.png',
  '샐러드/과일': '/icons/salad_fruit.png',
  '김밥': '/icons/kimbap_korean.png',
  '도시락': '/icons/dosilak.png',
  '떡/전통한과': '/icons/ricecake_traditional.png',
  '답례품': '/icons/gift.png',
  '당일배송': '/icons/delivery.png'
}

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
  additionalSettings?: string[]
  averageRating?: number
  reviewCount?: number
}

interface CategoryProductListProps {
  categoryName: string
}

export default function CategoryProductList({ categoryName }: CategoryProductListProps) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('카테고리:', categoryName)

        let productData: Product[] = []

        // 답례품 카테고리인 경우
        if (categoryName === '답례품') {
          const productsQuery = query(
            collection(db, 'products'),
            where('additionalSettings', 'array-contains', '답례품'),
            where('status', '==', 'active')
          )
          const productsSnapshot = await getDocs(productsQuery)
          console.log('답례품 상품 수:', productsSnapshot.docs.length)

          productData = productsSnapshot.docs.map(docSnap => {
            const data = docSnap.data()
            console.log('상품 데이터:', data)
            console.log('minOrderDays 값:', data.minOrderDays)
            return {
              id: docSnap.id,
              ...data
            } as Product
          })
        }
        // 당일배송 카테고리인 경우
        else if (categoryName === '당일배송') {
          const productsQuery = query(
            collection(db, 'products'),
            where('additionalSettings', 'array-contains', '당일배송'),
            where('status', '==', 'active')
          )
          const productsSnapshot = await getDocs(productsQuery)
          console.log('당일배송 상품 수:', productsSnapshot.docs.length)

          productData = productsSnapshot.docs.map(docSnap => {
            const data = docSnap.data()
            console.log('상품 데이터:', data)
            console.log('minOrderDays 값:', data.minOrderDays)
            return {
              id: docSnap.id,
              ...data
            } as Product
          })
        } else {
          // 일반 카테고리의 경우: products의 category 배열에서 조회
          const productsQuery = query(
            collection(db, 'products'),
            where('category', 'array-contains', categoryName),
            where('status', '==', 'active')
          )
          const productsSnapshot = await getDocs(productsQuery)
          console.log('해당 카테고리 전체 상품 수:', productsSnapshot.docs.length)

          productData = productsSnapshot.docs.map(docSnap => {
            const data = docSnap.data()
            console.log('상품 데이터:', data)
            console.log('minOrderDays 값:', data.minOrderDays)
            return {
              id: docSnap.id,
              ...data
            } as Product
          })

          console.log('active 상품 수:', productData.length)
        }

        // 각 상품의 storeId로 storeName과 리뷰 정보 가져오기
        const productsWithStoreNameAndReviews = await Promise.all(
          productData.map(async (product) => {
            const updatedProduct = { ...product }

            // storeName 가져오기
            if (product.storeId && !product.storeName) {
              try {
                const storeDoc = await getDoc(doc(db, 'stores', product.storeId))
                if (storeDoc.exists()) {
                  updatedProduct.storeName = storeDoc.data().storeName || storeDoc.data().name
                }
              } catch (error) {
                console.error('가게 정보 가져오기 실패:', error)
              }
            }

            // 리뷰 정보 가져오기
            try {
              const reviewsQuery = query(
                collection(db, 'reviews'),
                where('productId', '==', product.id)
              )
              const reviewsSnapshot = await getDocs(reviewsQuery)
              const reviews = reviewsSnapshot.docs.map(doc => doc.data())

              if (reviews.length > 0) {
                const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0)
                updatedProduct.averageRating = totalRating / reviews.length
                updatedProduct.reviewCount = reviews.length
              } else {
                updatedProduct.averageRating = 0
                updatedProduct.reviewCount = 0
              }
            } catch (error) {
              console.error('리뷰 정보 가져오기 실패:', error)
              updatedProduct.averageRating = 0
              updatedProduct.reviewCount = 0
            }

            return updatedProduct
          })
        )

        setProducts(productsWithStoreNameAndReviews)
      } catch (error) {
        console.error('상품 데이터 가져오기 실패:', error)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [categoryName])

  // 카테고리 아이콘 가져오기 (❤️, ⚡ 제거한 이름으로)
  const cleanCategoryName = categoryName.replace(/[❤️⚡]/g, '')
  const categoryIcon = categoryIcons[cleanCategoryName]

  // 검색 버튼 클릭 핸들러
  const handleSearch = () => {
    setSearchQuery(searchInput)
  }

  // 초기화 버튼 클릭 핸들러
  const handleReset = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  // 엔터키로 검색
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // 검색 필터링 (useMemo로 최적화)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [products, searchQuery])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleWrapper}>
        {categoryIcon && (
          <Image
            src={categoryIcon}
            alt={categoryName}
            width={35}
            height={35}
            className={styles.titleIcon}
          />
        )}
        <h2 className={styles.title}>{categoryName}</h2>
      </div>

      <div className={styles.filterSection}>
        <p className={styles.count}>총 {filteredProducts.length}개의 상품</p>

        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="원하는 상품을 검색해보세요"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              onClick={handleReset}
              className={styles.resetButton}
              type="button"
              aria-label="초기화"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <button
            onClick={handleSearch}
            className={styles.searchButton}
            type="button"
          >
            <Image
              src="/icons/search.svg"
              alt="검색"
              width={24}
              height={24}
              className={styles.searchIcon}
            />
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className={styles.emptyState}>
          {searchQuery ? '검색 결과가 없습니다.' : `${categoryName} 카테고리에 등록된 상품이 없습니다.`}
        </div>
      ) : (
        <div className={styles.productGrid}>
          {filteredProducts.map((product) => {
            const imageUrl = product.images && product.images.length > 0 ? product.images[0] : ''

            return (
              <div
                key={product.id}
                className={styles.card}
                onClick={() => router.push(`/productDetail/${product.id}`)}
              >
                <div className={styles.imageWrapper}>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      className={styles.image}
                      style={{ objectFit: 'cover' }}
                      priority
                      sizes="(max-width: 768px) 50vw, 300px"
                      quality={85}
                    />
                  ) : (
                    <div className={styles.placeholderImage}>
                      <span>이미지 없음</span>
                    </div>
                  )}
                </div>

                <div className={styles.info}>
                  {product.storeName && (
                    <div className={styles.storeName}>
                      {product.storeName}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.5 2L8.5 6L4.5 10" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <h3 className={styles.productName}>{product.name}</h3>

                  {/* 가격 정보 */}
                  {product.discount && product.discountedPrice && product.discount.discountPercent > 0 ? (
                    <div className={styles.priceSection}>
                      <span className={styles.originalPrice}>{product.price.toLocaleString()}원</span>
                      <span className={styles.discountedPrice}>{product.discountedPrice?.toLocaleString()}원</span>
                      <span className={styles.discountPercent}>{product.discount.discountPercent}%</span>
                    </div>
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

                  {/* 별점 정보 */}
                  {product.reviewCount !== undefined && (
                    <div className={styles.rating}>
                      <Image
                        src="/icons/star.png"
                        alt="별점"
                        width={16}
                        height={16}
                        className={styles.starIcon}
                      />
                      <span className={styles.ratingScore}>
                        {product.averageRating?.toFixed(1) || '0.0'}
                      </span>
                      <span className={styles.reviewCount}>
                        ({product.reviewCount?.toLocaleString() || '0'})
                      </span>
                    </div>
                  )}

                  {/* 추가 설정 - PC용 */}
                  <div className={styles.badgeContainerDesktop}>
                    {product.additionalSettings?.map((setting, idx) => (
                      <span key={idx} className={styles.settingBadge}>{setting}</span>
                    ))}
                  </div>

                  {/* 추가 설정 - 모바일용 */}
                  <div className={styles.badgeContainerMobile}>
                    {product.additionalSettings?.map((setting, idx) => (
                      <span key={idx} className={styles.settingBadge}>{setting}</span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
