'use client'

import { useState, useEffect } from 'react'
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
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const q = query(
          collection(db, 'stores'),
          where('status', '==', 'active'),
          limit(20)
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
        setStores(shuffledStores)
      } catch (error) {
        console.error('스토어 데이터 가져오기 실패:', error)
        setStores([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchStores()
  }, [])

  const filteredStores = selectedCategory === '전체'
    ? stores
    : stores.filter(store => store.businessCategory === selectedCategory)

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>단모 제휴업체</h2>
        <p className={styles.subtitle}>총 {filteredStores.length}개</p>
      </div>
      <div className={styles.storeGrid}>
        {filteredStores.length === 0 ? (
          <div className={styles.emptyState}>
            {selectedCategory === '전체' ? '등록된 업체가 없습니다.' : `${selectedCategory} 카테고리에 등록된 업체가 없습니다.`}
          </div>
        ) : (
          filteredStores.map((store, storeIndex) => {
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
                        // 상위 3개 스토어의 첫 번째 이미지만 priority
                        const shouldPrioritize = storeIndex < 3 && index === 0

                        return (
                          <SwiperSlide key={index}>
                            <div className={styles.imageWrapper}>
                              <OptimizedImage
                                src={image}
                                alt={`${store.storeName || '가게'} 이미지 ${index + 1}`}
                                fill
                                sizes="130px"
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
                  <div className={styles.categoryRow}>
                    <span className={styles.category}>{store.categories?.[0] || ''}</span>
                  </div>
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
          })
        )}
      </div>
    </div>
  )
}