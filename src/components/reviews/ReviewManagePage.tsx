'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import OptimizedImage from '@/components/common/OptimizedImage'
import DeleteConfirmModal from './DeleteConfirmModal'
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
  reply?: {
    content: string
    createdAt: { toDate: () => Date } | string
    partnerId: string
    isPrivate?: boolean
  }
}

export default function ReviewManagePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const modalRef = useRef<HTMLDivElement>(null)

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

  const handleDeleteClick = (reviewId: string) => {
    setReviewToDelete(reviewId)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return

    try {
      await deleteDoc(doc(db, 'reviews', reviewToDelete))
      setReviews(reviews.filter(review => review.id !== reviewToDelete))
      setDeleteModalOpen(false)
      setReviewToDelete(null)
      alert('리뷰가 삭제되었습니다.')
    } catch (error) {
      console.error('리뷰 삭제 실패:', error)
      alert('리뷰 삭제에 실패했습니다.')
      setDeleteModalOpen(false)
      setReviewToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setReviewToDelete(null)
  }

  const formatDate = (timestamp: { toDate: () => Date } | string) => {
    if (!timestamp) return ''
    const date = new Date(timestamp as string)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day} 작성`
  }

  // 7일 이내 작성 여부 확인
  const canEdit = (createdAt: { toDate: () => Date } | string): boolean => {
    const reviewDate = new Date(createdAt as string)
    const now = new Date()
    const diffTime = now.getTime() - reviewDate.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    return diffDays <= 7
  }

  const handleEdit = (reviewId: string, createdAt: { toDate: () => Date } | string) => {
    if (!canEdit(createdAt)) {
      alert('작성한 지 7일이 지난 리뷰는 수정할 수 없습니다.')
      return
    }
    router.push(`/reviews/edit/${reviewId}`)
  }

  // 이미지 클릭 핸들러
  const handleImageClick = (images: string[], index: number) => {
    setSelectedImages(images)
    setSelectedImageIndex(index)
  }

  // 이미지 모달 닫기
  const closeImageModal = () => {
    setSelectedImageIndex(null)
    setSelectedImages([])
  }

  // 이전 이미지
  const handlePrevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1)
    }
  }

  // 다음 이미지
  const handleNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < selectedImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1)
    }
  }

  // 터치 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  // 터치 이동
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  // 터치 종료 (스와이프 감지)
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // 왼쪽으로 스와이프 (다음 이미지)
      handleNextImage()
    }
    if (touchStart - touchEnd < -50) {
      // 오른쪽으로 스와이프 (이전 이미지)
      handlePrevImage()
    }
  }

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeImageModal()
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage()
      } else if (e.key === 'ArrowRight') {
        handleNextImage()
      }
    }

    if (selectedImageIndex !== null) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [selectedImageIndex, selectedImages.length])

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
                  <button
                    className={styles.editButton}
                    onClick={() => handleEdit(review.id, review.createdAt)}
                  >
                    수정
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteClick(review.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>

              {review.images && review.images.length > 0 && (
                <div className={styles.imageContainer}>
                  {review.images.map((image, index) => {
                    // 동영상 파일 확장자 체크
                    const isVideo = /\.(mp4|mov|avi|webm|mkv|3gp|3g2|m4v)$/i.test(image)

                    if (isVideo) {
                      return (
                        <div
                          key={index}
                          className={styles.imageWrapper}
                          onClick={() => handleImageClick(review.images, index)}
                        >
                          <video
                            src={image}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div className={styles.videoPlayButton}></div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={index}
                        className={styles.imageWrapper}
                        onClick={() => handleImageClick(review.images, index)}
                      >
                        <OptimizedImage
                          src={image}
                          alt={`리뷰 이미지 ${index + 1}`}
                          fill
                          className={styles.reviewImage}
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              <p className={styles.reviewContent}>{review.content}</p>

              {/* 파트너 답글 - isPrivate가 true가 아닌 경우에만 표시 */}
              {review.reply && !review.reply.isPrivate && (
                <div className={styles.replySection}>
                  <div className={styles.replyHeader}>
                    <span className={styles.replyLabel}>{review.storeName} 사장님</span>
                    <span className={styles.replyDate}>{formatDate(review.reply.createdAt)}</span>
                  </div>
                  <p className={styles.replyContent}>{review.reply.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteModalOpen && (
        <DeleteConfirmModal
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* 이미지 모달 */}
      {selectedImageIndex !== null && (
        <div className={styles.imageModal} onClick={closeImageModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={closeImageModal}>
              ✕
            </button>

            {selectedImageIndex > 0 && (
              <button className={styles.prevButton} onClick={handlePrevImage}>
                ‹
              </button>
            )}

            <div
              className={styles.imageContainer}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              ref={modalRef}
            >
              {/\.(mp4|mov|avi|webm|mkv|3gp|3g2|m4v)$/i.test(selectedImages[selectedImageIndex]) ? (
                <video
                  src={selectedImages[selectedImageIndex]}
                  controls
                  className={styles.modalImage}
                  style={{ maxWidth: '70vw', maxHeight: '70vh', width: 'auto', height: 'auto' }}
                />
              ) : (
                <Image
                  src={selectedImages[selectedImageIndex]}
                  alt={`리뷰 이미지 ${selectedImageIndex + 1}`}
                  width={800}
                  height={800}
                  className={styles.modalImage}
                  style={{ objectFit: 'contain' }}
                />
              )}
            </div>

            {selectedImageIndex < selectedImages.length - 1 && (
              <button className={styles.nextButton} onClick={handleNextImage}>
                ›
              </button>
            )}

            <div className={styles.imageCounter}>
              {selectedImageIndex + 1} / {selectedImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
