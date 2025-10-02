'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import styles from './StoreDetail.module.css'

interface Store {
  id: string
  storeName: string
  description?: string
  storeImages?: string[]
  categories?: string[]
  primaryCategory?: string
  rating?: number
  reviewCount?: number
  phone?: string
  address?: {
    fullAddress?: string
    detail?: string
  }
  closedDays?: string[]
}

interface StoreDetailProps {
  storeId: string
}

export default function StoreDetail({ storeId }: StoreDetailProps) {
  const router = useRouter()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const storeDoc = await getDoc(doc(db, 'stores', storeId))

        if (storeDoc.exists()) {
          setStore({
            id: storeDoc.id,
            ...storeDoc.data()
          } as Store)
        }
      } catch (error) {
        console.error('가게 정보 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [storeId])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>가게를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const images = store.storeImages && store.storeImages.length > 0 ? store.storeImages : []

  return (
    <div className={styles.container}>
      {/* 이미지 슬라이더 */}
      <div className={styles.imageSection}>
        {images.length > 0 ? (
          <>
            <div className={styles.mainImage}>
              <Image
                src={images[currentImageIndex]}
                alt={store.storeName}
                fill
                className={styles.image}
                style={{ objectFit: 'cover' }}
              />
            </div>

            {images.length > 1 && (
              <>
                <button
                  className={`${styles.arrowButton} ${styles.arrowLeft}`}
                  onClick={() => setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                >
                  ‹
                </button>
                <button
                  className={`${styles.arrowButton} ${styles.arrowRight}`}
                  onClick={() => setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                >
                  ›
                </button>

                <div className={styles.indicators}>
                  {images.map((_, index) => (
                    <button
                      key={index}
                      className={`${styles.indicator} ${index === currentImageIndex ? styles.indicatorActive : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className={styles.placeholderImage}>
            <span>이미지 없음</span>
          </div>
        )}
      </div>

      {/* 가게 정보 */}
      <div className={styles.infoSection}>
        <div className={styles.header}>
          <h1 className={styles.storeName}>{store.storeName}</h1>
          <div className={styles.rating}>
            <span className={styles.star}>⭐</span>
            <span className={styles.ratingNumber}>
              {store.rating ? store.rating.toFixed(1) : '0.0'}
            </span>
            <span className={styles.reviewCount}>
              ({store.reviewCount || 0})
            </span>
          </div>
        </div>

        {store.categories && store.categories.length > 0 && (
          <div className={styles.category}>{store.categories.join(' · ')}</div>
        )}

        {store.description && (
          <div className={styles.description}>
            {store.description}
          </div>
        )}

        <div className={styles.detailsSection}>
          <h2 className={styles.sectionTitle}>가게 정보</h2>

          {store.phone && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>전화</span>
              <span className={styles.detailValue}>{store.phone}</span>
            </div>
          )}

          {store.address && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>주소</span>
              <div className={styles.detailValueColumn}>
                {store.address.fullAddress && (
                  <span className={styles.detailValue}>{store.address.fullAddress}</span>
                )}
                {store.address.detail && (
                  <span className={styles.detailValue}>{store.address.detail}</span>
                )}
              </div>
            </div>
          )}

          {store.closedDays && store.closedDays.length > 0 && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>휴무일</span>
              <span className={styles.detailValue}>{store.closedDays.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
