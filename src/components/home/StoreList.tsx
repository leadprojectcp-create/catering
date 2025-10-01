'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
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
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const q = query(collection(db, 'stores'), where('isActive', '==', 'active'))
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
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.storeGrid}>
        {filteredStores.length === 0 ? (
          <div className={styles.emptyState}>
            {selectedCategory === '전체' ? '등록된 업체가 없습니다.' : `${selectedCategory} 카테고리에 등록된 업체가 없습니다.`}
          </div>
        ) : (
          filteredStores.map((store) => {
            const images = store.storeImages && store.storeImages.length > 0 ? store.storeImages : []

            return (
              <div key={store.id} className={styles.card}>
                {/* 이미지 슬라이더 */}
                <div className={styles.imageSlider}>
                  {images.length > 0 ? (
                    <Swiper
                      modules={[Navigation]}
                      slidesPerView={3}
                      spaceBetween={5}
                      navigation
                      className={styles.storeSwiper}
                    >
                      {images.map((image, index) => (
                        <SwiperSlide key={index}>
                          <div className={styles.imageWrapper}>
                            <Image
                              src={image}
                              alt={`${store.storeName || '가게'} 이미지 ${index + 1}`}
                              fill
                              className={styles.cardImage}
                              style={{ objectFit: 'cover' }}
                            />
                          </div>
                        </SwiperSlide>
                      ))}
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
                    <span className={styles.district}>
                      {store.address?.city && store.address?.district
                        ? `${store.address.city}/${store.address.district}`
                        : store.address?.city || store.address?.district || ''}
                    </span>
                    <span className={styles.category}>{store.categories?.[0] || ''}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{store.storeName}</h3>
                  <div className={styles.ratingRow}>
                    <span className={styles.star}>⭐</span>
                    <span className={styles.ratingNumber}>
                      {store.rating ? store.rating.toFixed(1) : '0.0'}
                    </span>
                    <span className={styles.reviewCount}>
                      ({store.reviewCount ? store.reviewCount.toLocaleString() : '0'})
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