'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import { generateStoreSlug } from '@/lib/utils/slug'
import Loading from '@/components/Loading'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import styles from './CategoryStoreList.module.css'

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

interface CategoryStoreListProps {
  categoryName: string
}

export default function CategoryStoreList({ categoryName }: CategoryStoreListProps) {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        // 답례품 또는 당일배송 카테고리인 경우 특별 처리
        if (categoryName === '답례품' || categoryName === '당일배송') {
          // 1. 먼저 products 컬렉션에서 additionalSettings에 해당 값이 포함된 상품들을 찾기
          const searchValue = categoryName === '답례품' ? '답례품' : '당일배송'
          const productsQuery = query(
            collection(db, 'products'),
            where('additionalSettings', 'array-contains', searchValue)
          )
          const productsSnapshot = await getDocs(productsQuery)

          // 상품을 가진 스토어 ID 수집
          const storeIds = new Set<string>()
          productsSnapshot.docs.forEach(doc => {
            const productData = doc.data()
            if (productData.storeId) {
              storeIds.add(productData.storeId)
            }
          })

          // 2. 해당 스토어들의 정보 가져오기
          if (storeIds.size > 0) {
            const storePromises = Array.from(storeIds).map(async (storeId) => {
              const storeQuery = query(
                collection(db, 'stores'),
                where('__name__', '==', storeId),
                where('status', '==', 'active')
              )
              const storeSnapshot = await getDocs(storeQuery)
              return storeSnapshot.docs[0]
            })

            const storeDocs = await Promise.all(storePromises)
            const storeData = storeDocs
              .filter(doc => doc && doc.exists())
              .map(doc => {
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

            setStores(storeData)
          } else {
            setStores([])
          }
        } else {
          // 일반 카테고리의 경우 기존 로직 사용
          const q = query(
            collection(db, 'stores'),
            where('status', '==', 'active'),
            where('categories', 'array-contains', categoryName)
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

          setStores(storeData)
        }
      } catch (error) {
        console.error('스토어 데이터 가져오기 실패:', error)
        setStores([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchStores()
  }, [categoryName])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{categoryName}</h1>
        <p className={styles.count}>총 {stores.length}개의 업체</p>
      </div>

      <div className={styles.storeGrid}>
        {stores.length === 0 ? (
          <div className={styles.emptyState}>
            {categoryName} 카테고리에 등록된 업체가 없습니다.
          </div>
        ) : (
          stores.map((store) => {
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
                onClick={() => router.push(`/store/${slug}`)}
              >
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
                              priority={index === 0}
                              loading={index === 0 ? 'eager' : 'lazy'}
                              sizes="(max-width: 768px) 100vw, 25vw"
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
                  <div className={styles.titleRow}>
                    <h3 className={styles.cardTitle}>{store.storeName}</h3>
                    <div className={styles.ratingRow}>
                      <Image
                        src="/icons/star.png"
                        alt="별점"
                        width={14}
                        height={14}
                        className={styles.star}
                      />
                      <span className={styles.ratingNumber}>
                        {store.rating ? store.rating.toFixed(1) : '0.0'}
                      </span>
                      <span className={styles.reviewCount}>
                        ({store.reviewCount ? store.reviewCount.toLocaleString() : '0'})
                      </span>
                    </div>
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
