'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, query, collection, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getAICategoryById } from '@/lib/services/aiCategoryService'
import type { AIRecommendedCategory } from '@/lib/services/aiCategoryService'
import Image from 'next/image'
import Loading from '@/components/Loading'
import LocationSettingModal from '@/components/home/LocationSettingModal'
import OptimizedImage from '@/components/common/OptimizedImage'
import { useAuth } from '@/contexts/AuthContext'
import styles from './AICategoryProductList.module.css'
import { calculateDistance, getUserLocation, formatDistance } from '@/lib/utils/distance'
import { useProductSort, SORT_OPTIONS, SORT_LABELS, type SortOption } from './useAICategoryProductSort'

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
  category?: string[]
  status?: string
  averageRating?: number
  reviewCount?: number
  quantityRanges?: {
    minQuantity: number
    maxQuantity: number
    daysBeforeOrder: number
  }[]
  additionalSettings?: string[]
}

interface Props {
  categoryId: string
}

export default function AICategoryProductList({ categoryId }: Props) {
  const router = useRouter()
  const { user, userData } = useAuth()
  const [category, setCategory] = useState<AIRecommendedCategory | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [userLocation, setUserLocation] = useState<string | null>(null)
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('recommended')
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  // 사용자 위치 정보 로드
  useEffect(() => {
    if (userData?.location) {
      setUserLocation(userData.location.roadAddress || userData.location.address)
      if (userData.location.latitude && userData.location.longitude) {
        setUserCoordinates({
          latitude: userData.location.latitude,
          longitude: userData.location.longitude
        })
      }
    }
  }, [userData])

  // 사용자 위치가 변경되면 상품 거리 재계산
  useEffect(() => {
    if (userCoordinates && products.length > 0) {
      const updatedProducts = products.map(product => {
        if (product.storeLatitude && product.storeLongitude) {
          const distance = calculateDistance(
            userCoordinates.latitude,
            userCoordinates.longitude,
            product.storeLatitude,
            product.storeLongitude
          )
          return { ...product, distance }
        }
        return product
      })

      // 거리순으로 재정렬
      const sortedProducts = updatedProducts.sort((a, b) => {
        if (a.distance !== undefined && b.distance === undefined) return -1
        if (a.distance === undefined && b.distance !== undefined) return 1
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance
        }
        return 0
      })

      setProducts(sortedProducts)
    }
  }, [userCoordinates])

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
    const startDate = product.discount.startDate instanceof Timestamp
      ? product.discount.startDate.toDate()
      : new Date(product.discount.startDate)
    const endDate = product.discount.endDate instanceof Timestamp
      ? product.discount.endDate.toDate()
      : new Date(product.discount.endDate)

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

        // 사용자 위치 가져오기 - DB 우선
        let userLocation: { latitude: number; longitude: number } | null = null

        // 1순위: DB에 저장된 위치 (userData)
        if (userData?.location?.latitude && userData?.location?.longitude) {
          userLocation = {
            latitude: userData.location.latitude,
            longitude: userData.location.longitude,
          }
          console.log('[DB] DB에서 위치 정보 가져오기 성공:', userLocation)
        }
        // 2순위: 로컬/앱에 저장된 위치
        else {
          userLocation = getUserLocation()
        }

        console.log('=== 사용자 위치 정보 ===')
        console.log('사용자 위치:', userLocation)

        // 모바일 기기인지 확인
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        console.log('[Device] 모바일 기기:', isMobile)

        // DB나 앱에서 위치를 못 가져왔고, 모바일 기기이고, 브라우저 Geolocation API가 지원되는 경우 (모바일 웹만)
        if (!userLocation && isMobile && typeof window !== 'undefined' && navigator.geolocation) {
          console.log('[Browser] 모바일 웹 - 브라우저 위치 정보 요청 중...')
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                  enableHighAccuracy: true, // GPS 우선
                  timeout: 15000,
                  maximumAge: 300000, // 5분 캐시
                }
              )
            })

            userLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }
            console.log('[Browser] 위치 정보 가져오기 성공:', userLocation)

            // 로컬 스토리지에 저장
            try {
              localStorage.setItem('userLocation', JSON.stringify(userLocation))
            } catch (e) {
              console.error('[Browser] localStorage 저장 실패:', e)
            }
          } catch (error) {
            console.error('[Browser] 위치 정보 가져오기 실패:', error)
          }
        } else if (!userLocation && !isMobile) {
          console.log('[Browser] PC 웹 - 위치 기반 사용 안 함 (랜덤 정렬)')
        }

        if (userLocation) {
          console.log('사용자 위도 (latitude):', userLocation.latitude)
          console.log('사용자 경도 (longitude):', userLocation.longitude)
        }

        const productPromises = categoryData.productIds.map(async (productId) => {
          const productDoc = await getDoc(doc(db, 'products', productId))
          if (!productDoc.exists()) return null

          const productData = productDoc.data()
          const updatedProduct: any = { id: productDoc.id, ...productData }

          // 판매자 정보 가져오기
          if (productData.storeId) {
            const storeDoc = await getDoc(doc(db, 'stores', productData.storeId))
            if (storeDoc.exists()) {
              const storeData = storeDoc.data()
              updatedProduct.storeName = storeData.storeName || storeData.name

              // 위치 정보가 있으면 저장 (address 객체 내부에 있음)
              if (storeData.address?.latitude && storeData.address?.longitude) {
                updatedProduct.storeLatitude = storeData.address.latitude
                updatedProduct.storeLongitude = storeData.address.longitude

                console.log(`\n=== ${updatedProduct.storeName} 위치 정보 ===`)
                console.log('판매자 위도 (latitude):', storeData.address.latitude)
                console.log('판매자 경도 (longitude):', storeData.address.longitude)

                // 사용자 위치가 있으면 거리 계산
                if (userLocation) {
                  updatedProduct.distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    storeData.address.latitude,
                    storeData.address.longitude
                  )
                  console.log(`${updatedProduct.storeName} 최종 거리:`, updatedProduct.distance?.toFixed(2), 'km', `(${Math.round(updatedProduct.distance * 1000)}m)`)
                }
              }
            }
          }

          // 리뷰 정보 가져오기
          try {
            const reviewsQuery = query(
              collection(db, 'reviews'),
              where('productId', '==', productId)
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

          return updatedProduct as Product
        })

        const productsData = await Promise.all(productPromises)
        const validProducts = productsData.filter(
          (p): p is Product => p !== null && p.status === 'active'
        )

        // 거리순으로 정렬 (거리 정보가 있는 경우)
        const sortedProducts = validProducts.sort((a, b) => {
          // 거리 정보가 있는 상품을 우선
          if (a.distance !== undefined && b.distance === undefined) return -1
          if (a.distance === undefined && b.distance !== undefined) return 1

          // 둘 다 거리 정보가 있으면 가까운 순으로
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance
          }

          // 둘 다 거리 정보가 없으면 원래 순서 유지
          return 0
        })

        setProducts(sortedProducts)
      } catch (error) {
        console.error('데이터 로딩 에러:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [categoryId, userData])

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

  // 검색 필터링
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [products, searchQuery])

  // 정렬 적용
  const sortedProducts = useProductSort(filteredProducts, sortOption)

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false)
      }
    }

    if (isSortMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSortMenuOpen])

  // 정렬 옵션 변경 핸들러
  const handleSortChange = (option: SortOption) => {
    setSortOption(option)
    setIsSortMenuOpen(false)
  }

  const handleProductClick = (product: Product) => {
    router.push(`/productDetail/${product.id}`)
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
      <div className={styles.headerSection}>
        <div className={styles.titleWrapper}>
          <h2 className={styles.title}>{category.name}</h2>

          {/* 위치 설정 버튼 - 모바일에서는 titleWrapper 내부에 */}
          {user && (
            <div className={styles.locationButtonWrapper}>
              <LocationSettingModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onLocationSet={(location) => {
                  setUserLocation(location.address)
                  setIsLocationModalOpen(false)
                }}
                onOpenModal={() => setIsLocationModalOpen(true)}
                currentLocation={userLocation}
                inline={true}
              />
            </div>
          )}
        </div>

        <div className={styles.filterSection}>
          {/* 위치 설정 버튼 - 데스크톱에서는 filterSection 내부에 */}
          {user && (
            <div className={styles.locationButtonWrapperDesktop}>
              <LocationSettingModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onLocationSet={(location) => {
                  setUserLocation(location.address)
                  setIsLocationModalOpen(false)
                }}
                onOpenModal={() => setIsLocationModalOpen(true)}
                currentLocation={userLocation}
                inline={true}
              />
            </div>
          )}

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
      </div>

      <div className={styles.countRow}>
        <p className={styles.count}>총 {filteredProducts.length}개의 상품</p>

        {/* 정렬 드롭다운 */}
        <div className={styles.sortDropdown} ref={sortDropdownRef}>
          <button
            className={`${styles.sortButton} ${isSortMenuOpen ? styles.open : ''}`}
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            type="button"
          >
            <span>{SORT_LABELS[sortOption]}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {isSortMenuOpen && (
            <div className={styles.sortMenu}>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option}
                  className={`${styles.sortMenuItem} ${sortOption === option ? styles.active : ''}`}
                  onClick={() => handleSortChange(option)}
                  type="button"
                >
                  {SORT_LABELS[option]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {sortedProducts.length === 0 ? (
        <div className={styles.emptyState}>
          {searchQuery ? '검색 결과가 없습니다.' : '상품이 없습니다.'}
        </div>
      ) : (
        <div className={styles.productGrid}>
          {sortedProducts.map((product) => {
            const validDiscount = isDiscountValid(product)
            const imageUrl = product.images && product.images.length > 0 ? product.images[0] : ''

            return (
              <div
                key={product.id}
                className={styles.cardWrapper}
                onClick={() => handleProductClick(product)}
              >
                <div className={styles.card}>
                  <div className={styles.imageWrapper}>
                    {imageUrl ? (
                      <OptimizedImage
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className={styles.image}
                        sizes="(max-width: 768px) 120px, 195px"
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

                    {/* 거리 표시 */}
                    {product.distance !== undefined && (
                      <div className={styles.distanceWrapper}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8.00065 1.3335C5.42065 1.3335 3.33398 3.42016 3.33398 6.00016C3.33398 9.50016 8.00065 14.6668 8.00065 14.6668C8.00065 14.6668 12.6673 9.50016 12.6673 6.00016C12.6673 3.42016 10.5807 1.3335 8.00065 1.3335ZM8.00065 7.66683C7.55862 7.66683 7.1347 7.49123 6.82214 7.17867C6.50958 6.86611 6.33398 6.44219 6.33398 6.00016C6.33398 5.55814 6.50958 5.13421 6.82214 4.82165C7.1347 4.50909 7.55862 4.3335 8.00065 4.3335C8.44268 4.3335 8.8666 4.50909 9.17916 4.82165C9.49172 5.13421 9.66732 5.55814 9.66732 6.00016C9.66732 6.44219 9.49172 6.86611 9.17916 7.17867C8.8666 7.49123 8.44268 7.66683 8.00065 7.66683Z" fill="#4E5968"/>
                        </svg>
                        <span className={styles.storeDistance}>
                          내 위치에서 {formatDistance(product.distance)}
                        </span>
                      </div>
                    )}

                    <h3 className={styles.productName}>{product.name}</h3>

                    {/* 가격 정보 - 모바일/데스크톱 모두 표시 */}
                    {validDiscount && product.discountedPrice ? (
                      <div className={styles.priceSection}>
                        <span className={styles.originalPrice}>{product.price.toLocaleString()}원</span>
                        <span className={styles.discountedPrice}>{product.discountedPrice?.toLocaleString()}원</span>
                        <span className={styles.discountPercent}>{product.discount!.discountPercent}%</span>
                      </div>
                    ) : (
                      <span className={styles.regularPrice}>{product.price.toLocaleString()}원</span>
                    )}

                    {/* 데스크톱 전용 정보 */}
                    <div className={styles.desktopOnly}>
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

                      {/* 추가 설정 - PC용 */}
                      <div className={styles.badgeContainerDesktop}>
                        {product.additionalSettings?.map((setting, idx) => (
                          <span key={idx} className={styles.settingBadge}>{setting}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 모바일에서는 카드 밖으로 정보 표시 */}
                <div className={styles.mobileInfo}>
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

                  {/* 별점과 배지를 한 줄로 */}
                  <div className={styles.ratingBadgeRow}>
                    {/* 별점 정보 - 왼쪽 정렬 */}
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

                    {/* 추가 설정 - 오른쪽 정렬 */}
                    <div className={styles.badgeContainerMobile}>
                      {product.additionalSettings?.map((setting, idx) => (
                        <span key={idx} className={styles.settingBadge}>{setting}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 단모 PICK - productReasons 표시 */}
                {category.productReasons && category.productReasons[product.id] && (
                  <div className={styles.danmoPickBox}>
                    <div className={styles.danmoPickHeader}>
                      <Image
                        src="/icons/danmo-pick.png"
                        alt="단모 PICK"
                        width={24}
                        height={24}
                        className={styles.danmoPickIcon}
                      />
                      <p className={styles.danmoPickTitle}>단모 PICK</p>
                    </div>
                    <p className={styles.danmoPickReason}>
                      {category.productReasons[product.id]}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
