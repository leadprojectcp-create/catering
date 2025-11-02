'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getPublishedNoticesByPartner, Notice } from '@/lib/services/partnerNoticeService'
import { createOrGetChatRoom } from '@/lib/services/chatService'
import { useAuth } from '@/contexts/AuthContext'
import { useStoreLike } from '@/hooks/useStoreLike'
import Loading from '@/components/Loading'
import ProductList from '@/components/store/ProductList'
import OptimizedImage from '@/components/common/OptimizedImage'
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
  partnerId?: string
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
  const [notices, setNotices] = useState<Notice[]>([])
  const [noticesLoading, setNoticesLoading] = useState(true)
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)

  // 좋아요 훅 사용
  const { isLiked, likeCount, setLikeCount, handleLikeToggle } = useStoreLike({
    storeId,
    storeName: store?.storeName || '',
    storeImage: store?.storeImages?.[0],
    initialLikeCount: 0
  })

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

    // 공지사항 로드
    const fetchNotices = async () => {
      try {
        const partnerNotices = await getPublishedNoticesByPartner(storeId)
        setNotices(partnerNotices)
      } catch (error) {
        console.error('공지사항 로드 실패:', error)
      } finally {
        setNoticesLoading(false)
      }
    }

    fetchNotices()
  }, [storeId, user, setLikeCount])

  if (loading) {
    return <Loading />
  }

  if (!store) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>가게를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const images = store.storeImages && store.storeImages.length > 0 ? store.storeImages : []

  const handleChatClick = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    if (!store?.partnerId) {
      alert('가게 정보를 불러오는 중입니다.')
      return
    }

    try {
      const roomId = await createOrGetChatRoom(
        user.uid,
        storeId,
        store.storeName,
        store.partnerId
      )
      router.push(`/chat?roomId=${roomId}`)
    } catch (error) {
      console.error('채팅방 생성 실패:', error)
      alert('채팅방 생성에 실패했습니다.')
    }
  }

  return (
    <div className={styles.container}>
      {/* 상단 섹션: 이미지 + 정보 */}
      <div className={styles.topSection}>
        {/* 이미지 슬라이더 */}
        <div className={styles.imageSection}>
        {images.length > 0 ? (
          <>
            <div className={styles.mainImage}>
              <OptimizedImage
                src={images[currentImageIndex]}
                alt={store.storeName}
                fill
                sizes="(max-width: 768px) 100vw, 390px"
                className={styles.image}
                style={{ objectFit: 'cover' }}
                priority
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
              {store.address?.city && store.address?.district && (
                <span>{store.address.city} | {store.address.district}</span>
              )}
            </div>
            <button
              className={`${styles.likeButton} ${isLiked ? styles.liked : ''}`}
              onClick={handleLikeToggle}
            >
              <OptimizedImage
                src={isLiked ? "/icons/heart_active.png" : "/icons/heart.png"}
                alt="좋아요"
                width={24}
                height={24}
              />
            </button>
          </div>
          <div className={styles.nameRatingRow}>
            <h1 className={styles.storeName}>{store.storeName}</h1>
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
              <OptimizedImage src="/icons/map_pin.png" alt="주소" width={24} height={24} />
              <span className={styles.detailValue}>
                {store.address.fullAddress}
                {store.address.detail && ` ${store.address.detail}`}
              </span>
            </div>
          )}

          {store.openingHours && (
            <div className={styles.detailItem}>
              <OptimizedImage src="/icons/clock.png" alt="운영시간" width={24} height={24} />
              <span className={styles.detailValue}>{store.openingHours}</span>
            </div>
          )}

          {store.closedDays && store.closedDays.length > 0 && (
            <div className={styles.detailItem}>
              <OptimizedImage src="/icons/clock.png" alt="휴무일" width={24} height={24} />
              <span className={styles.detailValue}>
                {store.closedDays.join(', ')} 휴무
              </span>
            </div>
          )}
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.chatButton} onClick={handleChatClick}>
            <OptimizedImage src="/icons/chat.png" alt="채팅" width={20} height={20} />
            <span>채팅</span>
          </button>
          {store.phone && (
            <a href={`tel:${store.phone}`} className={styles.phoneButton}>
              <OptimizedImage src="/icons/phone.png" alt="전화" width={20} height={20} />
              <span>전화</span>
            </a>
          )}
        </div>

        {/* 공지사항 섹션 */}
        {!noticesLoading && notices.length > 0 && (
          <div className={styles.noticeSection}>
            <div className={styles.sectionTitle}>가게공지사항</div>
            <div className={styles.noticeList}>
              {notices.map((notice) => (
                <div key={notice.id} className={styles.noticeItem} onClick={() => setSelectedNotice(notice)}>
                  <p className={styles.noticeTitle}>[{notice.title}]</p>
                  <p className={styles.noticeContent}>{notice.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 공지사항 팝업 */}
        {selectedNotice && (
          <div className={styles.noticeModal} onClick={() => setSelectedNotice(null)}>
            <div className={styles.noticeModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.noticeModalHeader}>
                <h3 className={styles.noticeModalTitle}>가게공지사항</h3>
                <button
                  className={styles.noticeModalClose}
                  onClick={() => setSelectedNotice(null)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.noticeModalBody}>
                <p className={styles.noticeModalTitleText}>[{selectedNotice.title}]</p>
                <p className={styles.noticeModalText}>{selectedNotice.content}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* 구분선 */}
      <div className={styles.divider}></div>

      {/* 상품 목록 */}
      <ProductList storeId={storeId} />
    </div>
  )
}
