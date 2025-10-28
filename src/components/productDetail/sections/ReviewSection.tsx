'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Review } from '../types'
import styles from './ReviewSection.module.css'

interface ReviewSectionProps {
  reviews: Review[]
  loadingReviews: boolean
}

type SortType = '베스트순' | '최신순' | '별점 높은 순' | '별점 낮은 순'

export default function ReviewSection({ reviews, loadingReviews }: ReviewSectionProps) {
  const [sortType, setSortType] = useState<SortType>('베스트순')
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const modalRef = useRef<HTMLDivElement>(null)

  // 리뷰 정렬 로직
  const sortedReviews = useMemo(() => {
    const reviewsCopy = [...reviews]

    switch (sortType) {
      case '베스트순':
        // 베스트순: 별점 높은 순 + 이미지 있는 리뷰 우선 + 최신순
        return reviewsCopy.sort((a, b) => {
          // 1. 이미지가 있는 리뷰를 우선
          const aHasImage = a.images && a.images.length > 0 ? 1 : 0
          const bHasImage = b.images && b.images.length > 0 ? 1 : 0
          if (aHasImage !== bHasImage) return bHasImage - aHasImage

          // 2. 별점이 높은 순
          if (a.rating !== b.rating) return b.rating - a.rating

          // 3. 최신순
          return b.createdAt.getTime() - a.createdAt.getTime()
        })

      case '최신순':
        return reviewsCopy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      case '별점 높은 순':
        return reviewsCopy.sort((a, b) => {
          if (a.rating !== b.rating) return b.rating - a.rating
          return b.createdAt.getTime() - a.createdAt.getTime()
        })

      case '별점 낮은 순':
        return reviewsCopy.sort((a, b) => {
          if (a.rating !== b.rating) return a.rating - b.rating
          return b.createdAt.getTime() - a.createdAt.getTime()
        })

      default:
        return reviewsCopy
    }
  }, [reviews, sortType])

  const filterOptions: SortType[] = ['베스트순', '최신순', '별점 높은 순', '별점 낮은 순']

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

  return (
    <div className={styles.reviewSection}>
      <h3 className={styles.reviewTitle}>리뷰 ({reviews.length})</h3>

      {reviews.length > 0 && (
        <div className={styles.filterContainer}>
          {filterOptions.map((option) => (
            <button
              key={option}
              className={`${styles.filterButton} ${sortType === option ? styles.filterButtonActive : ''}`}
              onClick={() => setSortType(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {loadingReviews ? (
        <div className={styles.reviewLoading}>리뷰를 불러오는 중...</div>
      ) : reviews.length === 0 ? (
        <div className={styles.reviewEmpty}>아직 작성된 리뷰가 없습니다.</div>
      ) : (
        <div className={styles.reviewList}>
          {sortedReviews.map((review) => (
            <div key={review.id} className={styles.reviewItem}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewUser}>
                  <span className={styles.reviewUserName}>{review.userName}</span>
                  <div className={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={star <= review.rating ? styles.starFilled : styles.starEmpty}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <span className={styles.reviewDate}>
                  {review.createdAt.toLocaleDateString('ko-KR')}
                </span>
              </div>
              {review.images && review.images.length > 0 && (
                <div className={styles.reviewImages}>
                  {review.images.map((imageUrl, index) => (
                    <div
                      key={index}
                      className={styles.reviewImageItem}
                      onClick={() => handleImageClick(review.images || [], index)}
                    >
                      <Image
                        src={imageUrl}
                        alt={`리뷰 이미지 ${index + 1}`}
                        width={80}
                        height={80}
                        className={styles.reviewImage}
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className={styles.reviewContent}>{review.content}</p>
            </div>
          ))}
        </div>
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
              <Image
                src={selectedImages[selectedImageIndex]}
                alt={`리뷰 이미지 ${selectedImageIndex + 1}`}
                width={800}
                height={800}
                className={styles.modalImage}
                style={{ objectFit: 'contain' }}
              />
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
