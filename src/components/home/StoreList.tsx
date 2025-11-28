'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import { generateStoreSlug } from '@/lib/utils/slug'
import { incrementStoreView } from '@/lib/services/storeService'
import Loading from '@/components/Loading'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import styles from './StoreList.module.css'

const PAGE_SIZE = 24

// Fisher-Yates 셔플 알고리즘
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

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
}

interface StoreListProps {
  selectedCategory: string
}

export default function StoreList({ selectedCategory }: StoreListProps) {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // 스토어 데이터 변환 함수
  const parseStoreDoc = (doc: QueryDocumentSnapshot<DocumentData>): Store => {
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
    }
  }

  // 초기 로드
  const fetchInitialStores = useCallback(async () => {
    setIsLoading(true)
    try {
      const q = selectedCategory === '전체'
        ? query(
            collection(db, 'stores'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE)
          )
        : query(
            collection(db, 'stores'),
            where('status', '==', 'active'),
            where('businessCategory', '==', selectedCategory),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE)
          )

      const snapshot = await getDocs(q)
      const storeData = snapshot.docs.map(parseStoreDoc)

      // 랜덤 정렬
      setStores(shuffleArray(storeData))
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
      setHasMore(snapshot.docs.length === PAGE_SIZE)
    } catch (error) {
      console.error('스토어 데이터 가져오기 실패:', error)
      setStores([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory])

  // 추가 로드
  const fetchMoreStores = useCallback(async () => {
    if (!lastDoc || isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const q = selectedCategory === '전체'
        ? query(
            collection(db, 'stores'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(PAGE_SIZE)
          )
        : query(
            collection(db, 'stores'),
            where('status', '==', 'active'),
            where('businessCategory', '==', selectedCategory),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(PAGE_SIZE)
          )

      const snapshot = await getDocs(q)
      const newStores = snapshot.docs.map(parseStoreDoc)

      // 추가 로드된 데이터도 랜덤 정렬
      setStores(prev => [...prev, ...shuffleArray(newStores)])
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
      setHasMore(snapshot.docs.length === PAGE_SIZE)
    } catch (error) {
      console.error('추가 스토어 로드 실패:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [lastDoc, isLoadingMore, hasMore, selectedCategory])

  // 카테고리 변경 또는 초기 로드
  useEffect(() => {
    setStores([])
    setLastDoc(null)
    setHasMore(true)
    fetchInitialStores()
  }, [fetchInitialStores])

  // Intersection Observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchMoreStores()
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
  }, [fetchMoreStores, hasMore, isLoadingMore])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>단모 제휴업체</h2>
        <p className={styles.subtitle}>{stores.length}개+</p>
      </div>
      <div className={styles.storeGrid}>
        {stores.length === 0 ? (
          <div className={styles.emptyState}>
            {selectedCategory === '전체' ? '등록된 업체가 없습니다.' : `${selectedCategory} 카테고리에 등록된 업체가 없습니다.`}
          </div>
        ) : (
          <>
            {stores.map((store: Store) => {
              const images = store.storeImages && store.storeImages.length > 0 ? store.storeImages : []

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
                  onClick={() => {
                    incrementStoreView(store.id)  // 백그라운드에서 실행
                    router.push(`/store/${slug}`)  // 즉시 페이지 이동
                  }}
                >
                  <div
                    className={styles.imageSlider}
                    onClick={(e) => {
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
                        {images.slice(0, 3).map((image: string, index: number) => {
                          // 썸네일용 작은 이미지 URL 생성 (width=200, quality=80)
                          const thumbnailUrl = image.includes('danmo-cdn.win')
                            ? image.replace('danmo-cdn.win', 'danmo-cdn.win/cdn-cgi/image/width=200,quality=80,format=webp')
                            : image

                          return (
                            <SwiperSlide key={index}>
                              <div className={styles.imageWrapper}>
                                <img
                                  src={thumbnailUrl}
                                  alt={`${store.storeName || '판매자'} 이미지 ${index + 1}`}
                                  className={styles.cardImage}
                                  loading="lazy"
                                  decoding="async"
                                  style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
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

            {/* 더 로드할 게 있으면 트리거 */}
            {hasMore && (
              <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
                {isLoadingMore && <Loading />}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
