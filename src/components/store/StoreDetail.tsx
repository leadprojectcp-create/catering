'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toggleStoreLike, checkUserLiked } from '@/lib/services/storeService'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Loading from '@/components/Loading'
import ProductList from '@/components/product/ProductList'
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
    city?: string
    district?: string
    dong?: string
    fullAddress?: string
    detail?: string
  }
  closedDays?: string[]
  openingHours?: string
}

interface StoreDetailProps {
  storeId: string
}

export default function StoreDetail({ storeId }: StoreDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const storeDoc = await getDoc(doc(db, 'stores', storeId))

        if (storeDoc.exists()) {
          const storeData = storeDoc.data()
          setStore({
            id: storeDoc.id,
            ...storeData
          } as Store)
          setLikeCount(storeData.likeCount || 0)
        }
      } catch (error) {
        console.error('가게 정보 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStore()

    // 사용자가 로그인했으면 좋아요 상태 확인
    if (user) {
      checkUserLiked(user.uid, storeId).then(setIsLiked)
    }
  }, [storeId, user])

  if (loading) {
    return (
      <>
        <Header />
        <Loading />
        <Footer />
      </>
    )
  }

  if (!store) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.error}>가게를 찾을 수 없습니다.</div>
        </div>
        <Footer />
      </>
    )
  }

  const images = store.storeImages && store.storeImages.length > 0 ? store.storeImages : []

  const handleLikeToggle = async () => {
    // 로그인 체크
    if (!user) {
      alert('로그인이 필요한 기능입니다.')
      router.push('/auth/login')
      return
    }

    if (!store) return

    try {
      const prevLikedState = isLiked

      // 낙관적 업데이트
      setIsLiked(!isLiked)
      setLikeCount(prev => !isLiked ? prev + 1 : prev - 1)

      // DB 업데이트
      const newLikedState = await toggleStoreLike(
        user.uid,
        storeId,
        store.storeName,
        store.storeImages?.[0]
      )

      // DB 결과로 상태 동기화
      setIsLiked(newLikedState)
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
      // 실패 시 원래 상태로 롤백
      setIsLiked(isLiked)
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
      alert('좋아요 처리에 실패했습니다.')
    }
  }

  return (
    <>
      <Header />
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
          <div className={styles.topRow}>
            <div className={styles.location}>
              {store.address?.city && store.address?.district && store.primaryCategory && (
                <span>{store.address.city}, {store.address.district} | {store.primaryCategory}</span>
              )}
            </div>
            <button
              className={`${styles.likeButton} ${isLiked ? styles.liked : ''}`}
              onClick={handleLikeToggle}
            >
              <Image
                src={isLiked ? "/icons/heart-filled.svg" : "/icons/heart.svg"}
                alt="좋아요"
                width={24}
                height={24}
              />
            </button>
          </div>
          <div className={styles.nameRatingRow}>
            <div className={styles.nameRatingWrapper}>
              <h1 className={styles.storeName}>{store.storeName}</h1>
              <div className={styles.rating}>
                <Image src="/icons/star.png" alt="star" width={16} height={16} className={styles.star} />
                <span className={styles.ratingNumber}>
                  {store.rating ? store.rating.toFixed(1) : '0.0'}/5
                </span>
                <span className={styles.reviewCount}>
                  ({store.reviewCount || 0})
                </span>
              </div>
            </div>
            <div className={styles.actionButtons}>
              <button className={styles.chatButton}>
                <Image src="/icons/chat.png" alt="채팅" width={20} height={20} />
                <span>채팅</span>
              </button>
              {store.phone && (
                <a href={`tel:${store.phone}`} className={styles.phoneButton}>
                  <Image src="/icons/phone.png" alt="전화" width={20} height={20} />
                  <span>전화</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {store.description && (
          <div className={styles.description}>
            {store.description}
          </div>
        )}

        <div className={styles.detailsSection}>
          {store.address && (
            <div className={styles.detailItem}>
              <Image src="/icons/map_pin.svg" alt="주소" width={24} height={24} />
              <span className={styles.detailValue}>
                {store.address.fullAddress}
                {store.address.detail && ` ${store.address.detail}`}
              </span>
            </div>
          )}

          {store.openingHours && (
            <div className={styles.detailItem}>
              <Image src="/icons/clock.svg" alt="운영시간" width={24} height={24} />
              <span className={styles.detailValue}>{store.openingHours} 휴무</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.divider}></div>

      {/* 상품 목록 */}
      <ProductList storeId={storeId} />
      </div>
      <Footer />
    </>
  )
}
