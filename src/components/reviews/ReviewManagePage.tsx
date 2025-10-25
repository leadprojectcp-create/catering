'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import OptimizedImage from '@/components/common/OptimizedImage'
import styles from './ReviewManagePage.module.css'

interface Review {
  id: string
  productId: string
  orderId: string
  storeId: string
  storeName: string
  rating: number
  content: string
  images: string[]
  createdAt: { toDate: () => Date } | string
}

export default function ReviewManagePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadReviews = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      try {
        const reviewsRef = collection(db, 'reviews')
        const q = query(
          reviewsRef,
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
        const querySnapshot = await getDocs(q)

        const reviewsList: Review[] = []
        querySnapshot.forEach((doc) => {
          reviewsList.push({
            id: doc.id,
            ...doc.data()
          } as Review)
        })

        setReviews(reviewsList)
      } catch (error) {
        console.error('리뷰 목록 로드 실패:', error)
        alert('리뷰 목록을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadReviews()
  }, [user, authLoading, router])

  const handleDelete = async (reviewId: string) => {
    if (!confirm('리뷰를 삭제하시겠습니까?')) return

    try {
      await deleteDoc(doc(db, 'reviews', reviewId))
      setReviews(reviews.filter(review => review.id !== reviewId))
      alert('리뷰가 삭제되었습니다.')
    } catch (error) {
      console.error('리뷰 삭제 실패:', error)
      alert('리뷰 삭제에 실패했습니다.')
    }
  }

  const formatDate = (timestamp: { toDate: () => Date } | string) => {
    if (!timestamp) return ''
    const date = typeof timestamp === 'object' && 'toDate' in timestamp
      ? timestamp.toDate()
      : new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day} 작성`
  }

  if (authLoading || loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>내가 쓴 리뷰 {reviews.length}개</h1>
        <p className={styles.subtitle}>작성한 리뷰는 7일 이내로 수정가능하며, 그 이후에는 삭제만 가능 합니다.</p>
      </div>

      {reviews.length === 0 ? (
        <div className={styles.emptyState}>
          <p>작성한 리뷰가 없습니다.</p>
        </div>
      ) : (
        <div className={styles.reviewList}>
          {reviews.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.storeInfo}>
                  <div className={styles.storeNameRow}>
                    <h3 className={styles.storeName}>{review.storeName}</h3>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.storeArrow}>
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                  <div className={styles.ratingRow}>
                    <div className={styles.rating}>
                      <OptimizedImage
                        src="/icons/review_star_active.png"
                        alt="별점"
                        width={16}
                        height={16}
                      />
                      <span className={styles.ratingText}>{review.rating}/5</span>
                    </div>
                    <div className={styles.reviewDate}>{formatDate(review.createdAt)}</div>
                  </div>
                </div>
                <div className={styles.actionButtons}>
                  <button className={styles.editButton}>수정</button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(review.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>

              {review.images && review.images.length > 0 && (
                <div className={styles.imageContainer}>
                  {review.images.map((image, index) => (
                    <OptimizedImage
                      key={index}
                      src={image}
                      alt={`리뷰 이미지 ${index + 1}`}
                      width={140}
                      height={140}
                      className={styles.reviewImage}
                    />
                  ))}
                </div>
              )}

              <p className={styles.reviewContent}>{review.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
