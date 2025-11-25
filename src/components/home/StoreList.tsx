'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import OptimizedImage from '@/components/common/OptimizedImage'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import { generateStoreSlug } from '@/lib/utils/slug'
import { incrementStoreView } from '@/lib/services/storeService'
import Loading from '@/components/Loading'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import styles from './StoreList.module.css'

interface Store {
  id: string
  storeName: string
  companyName?: string
  businessCategory: string
  businessAddress: string
  address?: {
    city?: string
    district?: string
  }
  categories?: string[]
  phone?: string
  website?: string
  imageUrl?: string
  storeImages?: string[]
  rating?: number
  reviewCount?: number
  businessHours?: string
  createdAt?: { toDate?: () => Date } | Date | string
  updatedAt?: { toDate?: () => Date } | Date | string
}

interface StoreListProps {
  selectedCategory: string
}

export default function StoreList({ selectedCategory }: StoreListProps) {
  const router = useRouter()
  const [allStores, setAllStores] = useState<Store[]>([]) // 전체 스토어 (60개)
  const [displayedStores, setDisplayedStores] = useState<Store[]>([]) // 화면에 표시할 스토어 (30개)
  const [displayCount, setDisplayCount] = useState(30) // 현재 표시 개수
  const [isLoading, setIsLoading] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const q = query(
          collection(db, 'stores'),
          where('status', '==', 'active'),
          limit(60) // 60개를 미리 로드
        )
        const querySnapshot = await getDocs(q)
        const storeData = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            storeName: data.storeName,
            companyName: data.companyName,
            businessCategory: data.businessCategory,
            businessAddress: typeof data.businessAddress === 'object'
              ? data.businessAddress.fullAddress || `${data.businessAddress.city || ''} ${data.businessAddress.district || ''} ${data.businessAddress.dong || ''} ${data.businessAddress.detail || ''}`.trim()
              : data.businessAddress,
            address: data.address || {},
            categories: data.categories || [],
            phone: data.phone,
            website: data.website,
            imageUrl: data.imageUrl,
            storeImages: data.storeImages || [],
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            businessHours: data.businessHours
          } as Store
        })

        // 랜덤 셔플
        const shuffledStores = storeData.sort(() => Math.random() - 0.5)
        setAllStores(shuffledStores)
        setDisplayedStores(shuffledStores.slice(0, 30)) // 처음 30개만 표시
      } catch (error) {
        console.error('스토어 데이터 가져오기 실패:', error)
        setAllStores([])
        setDisplayedStores([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchStores()
  }, [])

  // 카테고리 변경 시 필터링
  const filteredAllStores = selectedCategory === '전체'
    ? allStores
    : allStores.filter(store => store.businessCategory === selectedCategory)

  const filteredDisplayedStores = selectedCategory === '전체'
    ? displayedStores
    : displayedStores.filter(store => store.businessCategory === selectedCategory)

  // 다음 30개 로드
  const loadMore = useCallback(() => {
    const nextCount = displayCount + 30
    const newDisplayedStores = filteredAllStores.slice(0, nextCount)
    setDisplayedStores(newDisplayedStores)
    setDisplayCount(nextCount)
  }, [displayCount, filteredAllStores])

  // Intersection Observer로 스크롤 감지
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < filteredAllStores.length) {
          loadMore()
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
  }, [loadMore, displayCount, filteredAllStores.length])

  const filteredStores = filteredDisplayedStores

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>단모 제휴업체</h2>
        <p className={styles.subtitle}>총 {filteredAllStores.length}개</p>
      </div>
      <div className={styles.storeGrid}>
        {filteredStores.length === 0 ? (
          <div className={styles.emptyState}>
            {selectedCategory === '전체' ? '등록된 업체가 없습니다.' : `${selectedCategory} 카테고리에 등록된 업체가 없습니다.`}
          </div>
        ) : (
          <>
            {filteredStores.map((store, storeIndex) => {
            const images = store.storeImages && store.storeImages.length > 0 ? store.storeImages : []

            // URL 슬러그 생성
            const slug = generateStoreSlug(
              store.address?.city || '',
              store.address?.district || '',
              store.storeName,
              store.categories?.[0] || '',
              store.id
            )

            return (
              <div
                key={store.id}
                className={styles.card}
                onClick={async () => {
                  // 조회수 증가
                  await incrementStoreView(store.id)
                  // 페이지 이동
                  router.push(`/store/${slug}`)
                }}
              >
                {/* 이미지 슬라이더 */}
                <div
                  className={styles.imageSlider}
                  onClick={(e) => {
                    // 화살표 버튼을 클릭한 경우 이벤트 전파 중지
                    const target = e.target as HTMLElement
                    if (target.classList.contains('swiper-button-prev') ||
                        target.classList.contains('swiper-button-next') ||
                        target.closest('.swiper-button-prev') ||
                        target.closest('.swiper-button-next')) {
                      e.stopPropagation()
                    }
                  }}
                >
                  {images.length > 0 ? (
                    <Swiper
                      modules={[Navigation]}
                      slidesPerView={3}
                      spaceBetween={5}
                      navigation
                      watchSlidesProgress={true}
                      className={styles.storeSwiper}
                    >
                      {images.map((image, index) => {
                        // 상위 10개 스토어의 첫 번째 이미지만 priority
                        const shouldPrioritize = storeIndex < 10 && index === 0

                        return (
                          <SwiperSlide key={index}>
                            <div className={styles.imageWrapper}>
                              <OptimizedImage
                                src={image}
                                alt={`${store.storeName || '판매자'} 이미지 ${index + 1}`}
                                fill
                                sizes="260px"
                                quality={75}
                                className={styles.cardImage}
                                style={{ objectFit: 'cover' }}
                                priority={shouldPrioritize}
                                loading={shouldPrioritize ? undefined : "lazy"}
                              />
                            </div>
                          </SwiperSlide>
                        )
                      })}
                    </Swiper>
                  ) : (
                    <div className={styles.placeholderImage}>
                      <span>🍽️</span>
                    </div>
                  )}
                </div>

                {/* 카드 정보 */}
                <div className={styles.cardInfo}>
                  <div className={styles.titleRow}>
                    <h3 className={styles.cardTitle}>{store.storeName}</h3>
                    <span className={styles.district}>
                      {store.address?.city && store.address?.district
                        ? `${store.address.city}/${store.address.district}`
                        : store.address?.city || store.address?.district || ''}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Intersection Observer 타겟 */}
          {filteredStores.length < filteredAllStores.length && (
            <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
              {/* 스크롤 감지용 요소 */}
            </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}