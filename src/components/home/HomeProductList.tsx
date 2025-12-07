'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where, doc, getDoc, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import Loading from '@/components/Loading'
import { useAuth } from '@/contexts/AuthContext'
import styles from './HomeProductList.module.css'
import { calculateDistance, getUserLocation } from '@/lib/utils/distance'

const PAGE_SIZE = 20

type SortType = 'latest' | 'popular' | 'rating' | 'priceLow' | 'priceHigh'

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'rating', label: '평점순' },
  { value: 'priceLow', label: '낮은 가격순' },
  { value: 'priceHigh', label: '높은 가격순' },
]

interface Product {
  id: string
  name: string
  description?: string
  price: number
  discountedPrice?: number
  discount?: {
    discountAmount: number
    discountPercent: number
    startDate?: Timestamp | null
    endDate?: Timestamp | null
    isAlwaysActive?: boolean
  }
  images?: string[]
  storeId: string
  storeName?: string
  storeLatitude?: number
  storeLongitude?: number
  distance?: number
  storeCity?: string
  storeDistrict?: string
  category?: string[]
  status?: string
  minOrderQuantity?: number
  maxOrderQuantity?: number
  minOrderDays?: number
  quantityRanges?: {
    minQuantity: number
    maxQuantity: number
    daysBeforeOrder: number
  }[]
  additionalSettings?: string[]
  averageRating?: number
  reviewCount?: number
  viewCount?: number
  orderCount?: number
  createdAt?: Timestamp
}

interface HomeProductListProps {
  selectedCategories?: string[]
}

// 상품에 스토어 정보와 리뷰 정보 추가하는 함수
async function enrichProduct(
  product: Product,
  coordinates: { latitude: number; longitude: number } | null
): Promise<Product> {
  const updatedProduct = { ...product }

  // storeName 및 위치 정보 가져오기
  if (product.storeId) {
    try {
      const storeDoc = await getDoc(doc(db, 'stores', product.storeId))
      if (storeDoc.exists()) {
        const storeData = storeDoc.data()
        updatedProduct.storeName = storeData.storeName || storeData.name

        if (storeData.address?.latitude && storeData.address?.longitude) {
          updatedProduct.storeLatitude = storeData.address.latitude
          updatedProduct.storeLongitude = storeData.address.longitude
          updatedProduct.storeCity = storeData.address.city
          updatedProduct.storeDistrict = storeData.address.district

          if (coordinates) {
            updatedProduct.distance = calculateDistance(
              coordinates.latitude,
              coordinates.longitude,
              storeData.address.latitude,
              storeData.address.longitude
            )
          }
        }
      }
    } catch (error) {
      console.error('판매자 정보 가져오기 실패:', error)
    }
  }

  // 리뷰 정보 가져오기
  try {
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('productId', '==', product.id)
    )
    const reviewsSnapshot = await getDocs(reviewsQuery)
    const reviews = reviewsSnapshot.docs.map(d => d.data())

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
}

export default function HomeProductList({ selectedCategories = [] }: HomeProductListProps) {
  const router = useRouter()
  const { userData } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [sortType, setSortType] = useState<SortType>('popular')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const isInitialLoadRef = useRef(true)
  const isLoadingMoreRef = useRef(false)

  // 사용자 위치 정보 가져오기
  const getUserCoordinates = useCallback(() => {
    if (userData?.location?.latitude && userData?.location?.longitude) {
      return {
        latitude: userData.location.latitude,
        longitude: userData.location.longitude
      }
    }
    return getUserLocation()
  }, [userData])

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 인기도 점수 계산 함수 (조회수 + 주문수 + 리뷰수)
  const getPopularityScore = (product: Product): number => {
    const viewCount = product.viewCount || 0
    const orderCount = product.orderCount || 0
    const reviewCount = product.reviewCount || 0
    return viewCount + orderCount + reviewCount
  }

  // 정렬 함수
  const sortProducts = useCallback((productsToSort: Product[], sort: SortType): Product[] => {
    const sorted = [...productsToSort]
    switch (sort) {
      case 'popular':
        return sorted.sort((a, b) => getPopularityScore(b) - getPopularityScore(a))
      case 'rating':
        return sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
      case 'priceLow':
        return sorted.sort((a, b) => (a.discountedPrice || a.price) - (b.discountedPrice || b.price))
      case 'priceHigh':
        return sorted.sort((a, b) => (b.discountedPrice || b.price) - (a.discountedPrice || a.price))
      case 'latest':
      default:
        return sorted
    }
  }, [])

  // 할인 기간이 유효한지 체크하는 함수
  const isDiscountValid = (product: Product) => {
    if (!product.discount || !product.discount.discountPercent || product.discount.discountPercent <= 0) {
      return false
    }

    if (!product.discount.startDate || !product.discount.endDate) {
      return true
    }

    const now = new Date()
    const startDate = product.discount.startDate instanceof Timestamp
      ? product.discount.startDate.toDate()
      : new Date(product.discount.startDate)
    const endDate = product.discount.endDate instanceof Timestamp
      ? product.discount.endDate.toDate()
      : new Date(product.discount.endDate)

    return now >= startDate && now <= endDate
  }

  // 상품 로드 - selectedCategories 변경 시마다 실행
  useEffect(() => {
    let isMounted = true

    const fetchProducts = async () => {
      // 첫 로드일 때만 로딩 표시 (깜빡임 방지)
      if (isInitialLoadRef.current) {
        setIsLoading(true)
      }

      try {
        let q
        if (selectedCategories.length > 0) {
          q = query(
            collection(db, 'products'),
            where('status', '==', 'active'),
            where('category', 'array-contains-any', selectedCategories),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE)
          )
        } else {
          q = query(
            collection(db, 'products'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE)
          )
        }

        const snapshot = await getDocs(q)

        if (!isMounted) return

        const productData = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as Product))

        const coordinates = getUserCoordinates()

        // 스토어 정보와 리뷰 정보 추가
        const enrichedProducts = await Promise.all(
          productData.map(product => enrichProduct(product, coordinates))
        )

        if (!isMounted) return

        // 데이터가 준비된 후에만 한 번에 교체 (깜빡임 방지)
        setProducts(sortProducts(enrichedProducts, sortType))
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
        setHasMore(snapshot.docs.length === PAGE_SIZE)
        isInitialLoadRef.current = false
      } catch (error) {
        console.error('상품 데이터 가져오기 실패:', error)
        if (isMounted) {
          setProducts([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      isMounted = false
    }
  }, [selectedCategories, getUserCoordinates, sortType, sortProducts])

  // 추가 로드
  const fetchMoreProducts = useCallback(async () => {
    if (!lastDoc || isLoadingMoreRef.current || !hasMore) return

    isLoadingMoreRef.current = true
    setIsLoadingMore(true)
    try {
      let q
      if (selectedCategories.length > 0) {
        q = query(
          collection(db, 'products'),
          where('status', '==', 'active'),
          where('category', 'array-contains-any', selectedCategories),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        )
      } else {
        q = query(
          collection(db, 'products'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        )
      }

      const snapshot = await getDocs(q)
      const newProducts = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Product))

      const coordinates = getUserCoordinates()

      const enrichedProducts = await Promise.all(
        newProducts.map(product => enrichProduct(product, coordinates))
      )

      // 기존 상품 유지하고 새 상품만 뒤에 추가 (깜빡임 방지)
      setProducts(prev => [...prev, ...enrichedProducts])
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
      setHasMore(snapshot.docs.length === PAGE_SIZE)
    } catch (error) {
      console.error('추가 상품 로드 실패:', error)
    } finally {
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [lastDoc, hasMore, selectedCategories, getUserCoordinates])

  // Intersection Observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMoreRef.current) {
          fetchMoreProducts()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [fetchMoreProducts, hasMore])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>
            {selectedCategories.length > 0 ? selectedCategories.join(', ') : '전체 상품'}
          </h2>
          <p className={styles.subtitle}>총 {products.length}개의 상품</p>
        </div>

        {/* 정렬 드롭다운 */}
        <div className={styles.sortDropdown} ref={sortRef}>
          <button
            className={`${styles.sortButton} ${isSortOpen ? styles.open : ''}`}
            onClick={() => setIsSortOpen(!isSortOpen)}
          >
            {SORT_OPTIONS.find(opt => opt.value === sortType)?.label}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {isSortOpen && (
            <div className={styles.sortMenu}>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.sortMenuItem} ${sortType === option.value ? styles.active : ''}`}
                  onClick={() => {
                    setSortType(option.value)
                    setIsSortOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <div className={styles.emptyState}>
          등록된 상품이 없습니다.
        </div>
      ) : (
        <div className={styles.productGrid}>
          {products.map((product) => {
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
                      sizes="(max-width: 768px) 50vw, 220px"
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
                    <div
                      className={styles.storeName}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (product.storeId) {
                          router.push(`/store/${product.storeId}`)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {product.storeName}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.5 2L8.5 6L4.5 10" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}

                  {/* 지역 표시 */}
                  {(product.storeCity || product.storeDistrict) && (
                    <div className={styles.locationInfo}>
                      {product.storeCity && <span>{product.storeCity}</span>}
                      {product.storeCity && product.storeDistrict && <span> | </span>}
                      {product.storeDistrict && <span>{product.storeDistrict}</span>}
                    </div>
                  )}

                  <h3 className={styles.productName}>{product.name}</h3>

                  {/* 가격 정보 */}
                  {isDiscountValid(product) && product.discountedPrice ? (
                    <div className={styles.priceSection}>
                      <span className={styles.originalPrice}>{product.price.toLocaleString()}원</span>
                      <span className={styles.discountedPrice}>{product.discountedPrice?.toLocaleString()}원</span>
                      <span className={styles.discountPercent}>{product.discount!.discountPercent}%</span>
                    </div>
                  ) : (
                    <span className={styles.regularPrice}>{product.price.toLocaleString()}원</span>
                  )}

                  {/* 주문 가능 수량 */}
                  {product.quantityRanges && product.quantityRanges.length > 0 && (
                    <div className={styles.orderQuantity}>
                      최소 {product.quantityRanges[0].minQuantity}개 ~ 최대 {product.quantityRanges[product.quantityRanges.length - 1].maxQuantity}개 주문가능
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

                  {/* 추가 설정 배지 */}
                  {product.additionalSettings && product.additionalSettings.length > 0 && (
                    <div className={styles.badgeContainer}>
                      {product.additionalSettings.map((setting, idx) => (
                        <span key={idx} className={styles.settingBadge}>{setting}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* 더 로드할 게 있으면 트리거 */}
          {hasMore && (
            <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
              {isLoadingMore && <Loading />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
