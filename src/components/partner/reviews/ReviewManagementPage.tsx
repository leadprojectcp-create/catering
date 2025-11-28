'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { getPartnerReviews, addReplyToReview, deleteReplyFromReview, updateReplyInReview } from '@/lib/services/reviewService'
import { useAuth } from '@/contexts/AuthContext'
import type { Review } from '@/lib/services/reviewService'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Loading from '@/components/Loading'
import Image from 'next/image'
import OptimizedImage from '@/components/common/OptimizedImage'
import DateRangePicker from './DateRangePicker'
import CustomDropdown from './CustomDropdown'
import styles from './ReviewManagementPage.module.css'

interface Product {
  id: string
  name: string
}

interface ReviewData {
  reviews: Review[]
  products: Product[]
}

// SWR fetcher 함수
const fetchReviewData = async (userId: string): Promise<ReviewData> => {
  // 리뷰 데이터 가져오기
  const reviewsData = await getPartnerReviews(userId)

  // 상품 목록 가져오기
  const productsQuery = query(
    collection(db, 'products'),
    where('partnerId', '==', userId)
  )
  const productsSnapshot = await getDocs(productsQuery)
  const productsData = productsSnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name
  }))

  return {
    reviews: reviewsData,
    products: productsData
  }
}

export default function ReviewManagementPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [sortOrder, setSortOrder] = useState('latest') // 최신순, 미답변순, 별점높은순, 별점낮은순
  const [selectedProduct, setSelectedProduct] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([])
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyIsPrivate, setReplyIsPrivate] = useState(false)
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editReplyText, setEditReplyText] = useState('')
  const [editReplyIsPrivate, setEditReplyIsPrivate] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  // SWR로 리뷰 및 상품 데이터 관리
  const { data, error, isLoading, mutate } = useSWR<ReviewData>(
    user ? `reviews-${user.uid}` : null,
    () => fetchReviewData(user!.uid),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  const reviews = data?.reviews || []
  const products = data?.products || []

  useEffect(() => {
    applyFilters()
  }, [reviews, sortOrder, selectedProduct, startDate, endDate])

  const applyFilters = () => {
    let filtered = [...reviews]

    // 상품별 필터
    if (selectedProduct !== 'all') {
      filtered = filtered.filter(review => review.productId === selectedProduct)
    }

    // 기간 필터
    if (startDate) {
      filtered = filtered.filter(review => {
        const reviewDate = review.createdAt instanceof Timestamp
          ? review.createdAt.toDate()
          : new Date()
        return reviewDate >= new Date(startDate)
      })
    }
    if (endDate) {
      filtered = filtered.filter(review => {
        const reviewDate = review.createdAt instanceof Timestamp
          ? review.createdAt.toDate()
          : new Date()
        return reviewDate <= new Date(endDate + ' 23:59:59')
      })
    }

    // 정렬
    filtered.sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp
        ? a.createdAt.toMillis()
        : typeof a.createdAt === 'string'
        ? new Date(a.createdAt).getTime()
        : 0
      const dateB = b.createdAt instanceof Timestamp
        ? b.createdAt.toMillis()
        : typeof b.createdAt === 'string'
        ? new Date(b.createdAt).getTime()
        : 0

      switch (sortOrder) {
        case 'latest':
          return dateB - dateA
        case 'unanswered':
          // TODO: 답변 여부 필드 추가 필요
          return dateB - dateA
        case 'rating_high':
          return b.rating - a.rating
        case 'rating_low':
          return a.rating - b.rating
        default:
          return dateB - dateA
      }
    })

    setFilteredReviews(filtered)
  }

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId)
    return product ? product.name : '알 수 없는 상품'
  }

  const maskName = (name: string) => {
    if (!name) return '알 수 없음'
    if (name.length === 1) return name
    if (name.length === 2) return name[0] + '*'

    // 3글자 이상인 경우 첫 글자와 마지막 글자만 표시
    const firstChar = name[0]
    const lastChar = name[name.length - 1]
    const maskedMiddle = '*'.repeat(name.length - 2)

    return firstChar + maskedMiddle + lastChar
  }

  const formatDate = (date: Timestamp) => {
    const d = date instanceof Timestamp ? date.toDate() : new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}.${month}.${day} 작성`
  }

  const handleReplyClick = (reviewId: string) => {
    if (replyingTo === reviewId) {
      setReplyingTo(null)
      setReplyText('')
      setReplyIsPrivate(false)
    } else {
      setReplyingTo(reviewId)
      setReplyText('')
      setReplyIsPrivate(false)
    }
  }

  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) {
      alert('답글 내용을 입력해주세요.')
      return
    }

    if (!user) return

    try {
      await addReplyToReview(reviewId, replyText.trim(), user.uid, replyIsPrivate)
      alert('답글이 저장되었습니다.')

      // SWR 캐시 갱신
      mutate()

      setReplyingTo(null)
      setReplyText('')
      setReplyIsPrivate(false)
    } catch (error) {
      console.error('답글 저장 실패:', error)
      alert('답글 저장에 실패했습니다.')
    }
  }

  const handleReplyEdit = (reviewId: string, currentContent: string, isPrivate?: boolean) => {
    setEditingReplyId(reviewId)
    setEditReplyText(currentContent)
    setEditReplyIsPrivate(isPrivate || false)
  }

  const handleReplyEditSubmit = async (reviewId: string) => {
    if (!editReplyText.trim()) {
      alert('답글 내용을 입력해주세요.')
      return
    }

    try {
      await updateReplyInReview(reviewId, editReplyText.trim(), editReplyIsPrivate)
      alert('답글이 수정되었습니다.')

      // SWR 캐시 갱신
      mutate()

      setEditingReplyId(null)
      setEditReplyText('')
      setEditReplyIsPrivate(false)
    } catch (error) {
      console.error('답글 수정 실패:', error)
      alert('답글 수정에 실패했습니다.')
    }
  }

  const handleReplyDelete = async (reviewId: string) => {
    if (!confirm('답글을 삭제하시겠습니까?')) return

    try {
      await deleteReplyFromReview(reviewId)
      alert('답글이 삭제되었습니다.')

      // SWR 캐시 갱신
      mutate()
    } catch (error) {
      console.error('답글 삭제 실패:', error)
      alert('답글 삭제에 실패했습니다.')
    }
  }

  const getAverageRating = () => {
    const displayReviews = filteredReviews.length > 0 ? filteredReviews : reviews
    if (displayReviews.length === 0) return '0.0'
    const sum = displayReviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / displayReviews.length).toFixed(1)
  }

  const handleImageClick = (images: string[], index: number) => {
    setSelectedImages(images)
    setCurrentImageIndex(index)
  }

  const closeImageModal = () => {
    setSelectedImages([])
    setCurrentImageIndex(0)
  }

  const goToPrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? selectedImages.length - 1 : prev - 1))
  }

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => (prev === selectedImages.length - 1 ? 0 : prev + 1))
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      goToNextImage()
    }
    if (isRightSwipe) {
      goToPrevImage()
    }

    setTouchStart(0)
    setTouchEnd(0)
  }

  if (isLoading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>리뷰 관리</h1>
      </div>

      <div className={styles.statsContainer}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>전체 별점</span>
          <span className={styles.statValue}>{getAverageRating()}/5</span>
          <div className={styles.starRating}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Image
                key={star}
                src={star <= Math.round(parseFloat(getAverageRating())) ? '/icons/review_star_active.png' : '/icons/review_star.png'}
                alt="별점"
                width={16}
                height={16}
                className={styles.starIcon}
              />
            ))}
          </div>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>전체 리뷰</span>
          <span className={styles.statValue}>총 {reviews.length}개</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className={styles.emptyState}>
          아직 작성된 리뷰가 없습니다.
        </div>
      ) : (
        <div className={styles.reviewList}>
          <div className={styles.filterContainer}>
            <CustomDropdown
              options={[
                { value: 'latest', label: '최신순' },
                { value: 'unanswered', label: '미답변 순' },
                { value: 'rating_high', label: '별점 높은 순' },
                { value: 'rating_low', label: '별점 낮은 순' }
              ]}
              value={sortOrder}
              onChange={setSortOrder}
              className={styles.sortSelect}
            />

            <CustomDropdown
              options={[
                { value: 'all', label: '전체 상품' },
                ...products.map(product => ({
                  value: product.id,
                  label: product.name
                }))
              ]}
              value={selectedProduct}
              onChange={setSelectedProduct}
              className={styles.productSelect}
            />

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>

          <div className={styles.reviewCount}>
            리뷰 {filteredReviews.length}개
          </div>

          {filteredReviews.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewUser}>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{maskName(review.userName || '')}</span>
                    <div className={styles.rating}>
                      <Image
                        src="/icons/review_star_active.png"
                        alt="별점"
                        width={16}
                        height={16}
                        className={styles.starIcon}
                      />
                      <span className={styles.ratingText}>{review.rating}/5</span>
                    </div>
                  </div>
                </div>
                <span className={styles.reviewDate}>
                  {formatDate(review.createdAt)}
                </span>
              </div>
              <div className={styles.reviewBody}>
                {review.images && review.images.length > 0 && (
                  <div className={styles.reviewImages}>
                    {review.images.map((imageUrl, index) => {
                      // 동영상 파일 확장자 체크
                      const isVideo = /\.(mp4|mov|avi|webm|mkv|3gp|3g2|m4v)$/i.test(imageUrl)

                      if (isVideo) {
                        return (
                          <div
                            key={index}
                            className={styles.imageWrapper}
                            onClick={() => handleImageClick(review.images!, index)}
                          >
                            <video
                              src={imageUrl}
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
                          onClick={() => handleImageClick(review.images!, index)}
                        >
                          <OptimizedImage
                            src={imageUrl}
                            alt={`리뷰 이미지 ${index + 1}`}
                            fill
                            className={styles.reviewImage}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className={styles.reviewContent}>{review.content}</div>

                {review.reply ? (
                  editingReplyId === review.id ? (
                    <div className={styles.replySection}>
                      <textarea
                        className={styles.replyTextarea}
                        placeholder="부적절한 단어가 포함될 경우 관리자에 의해 댓글이 삭제될 수도 있습니다."
                        value={editReplyText}
                        onChange={(e) => setEditReplyText(e.target.value)}
                        rows={4}
                      />
                      <div className={styles.replyActions}>
                        <label className={styles.privateCheckboxLabel}>
                          <Image
                            src={editReplyIsPrivate ? '/icons/check_active.png' : '/icons/check_empty.png'}
                            alt="체크박스"
                            width={20}
                            height={20}
                            className={styles.checkboxIcon}
                            onClick={() => setEditReplyIsPrivate(!editReplyIsPrivate)}
                          />
                          <span onClick={() => setEditReplyIsPrivate(!editReplyIsPrivate)}>
                            고객에게만 보이는 글입니다
                          </span>
                        </label>
                        <div className={styles.replyButtonGroup}>
                          <button
                            className={styles.replyCancelButton}
                            onClick={() => {
                              setEditingReplyId(null)
                              setEditReplyText('')
                              setEditReplyIsPrivate(false)
                            }}
                          >
                            취소
                          </button>
                          <button
                            className={styles.replySubmitButton}
                            onClick={() => handleReplyEditSubmit(review.id!)}
                          >
                            수정
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.replyDisplay}>
                      <div className={styles.replyHeader}>
                        <span className={styles.replyDate}>
                          {review.reply.createdAt instanceof Timestamp
                            ? formatDate(review.reply.createdAt)
                            : ''}
                        </span>
                        <div className={styles.replyActions}>
                          <button
                            className={styles.replyEditButton}
                            onClick={() => handleReplyEdit(review.id!, review.reply!.content, review.reply!.isPrivate)}
                          >
                            <Image
                              src="/icons/edit.svg"
                              alt="수정"
                              width={16}
                              height={16}
                            />
                            수정
                          </button>
                          <button
                            className={styles.replyDeleteButton}
                            onClick={() => handleReplyDelete(review.id!)}
                          >
                            <Image
                              src="/icons/trash.svg"
                              alt="삭제"
                              width={16}
                              height={16}
                            />
                            삭제
                          </button>
                        </div>
                      </div>
                      <div className={styles.replyContent}>{review.reply.content}</div>
                    </div>
                  )
                ) : replyingTo === review.id ? (
                  <div className={styles.replySection}>
                    <textarea
                      className={styles.replyTextarea}
                      placeholder="부적절한 단어가 포함될 경우 관리자에 의해 댓글이 삭제될 수도 있습니다."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                    />
                    <div className={styles.replyActions}>
                      <label className={styles.privateCheckboxLabel}>
                        <Image
                          src={replyIsPrivate ? '/icons/check_active.png' : '/icons/check_empty.png'}
                          alt="체크박스"
                          width={20}
                          height={20}
                          className={styles.checkboxIcon}
                          onClick={() => setReplyIsPrivate(!replyIsPrivate)}
                        />
                        <span onClick={() => setReplyIsPrivate(!replyIsPrivate)}>
                          고객에게만 보이는 글입니다
                        </span>
                      </label>
                      <div className={styles.replyButtonGroup}>
                        <button
                          className={styles.replyCancelButton}
                          onClick={() => {
                            setReplyingTo(null)
                            setReplyText('')
                            setReplyIsPrivate(false)
                          }}
                        >
                          취소
                        </button>
                        <button
                          className={styles.replySubmitButton}
                          onClick={() => handleReplySubmit(review.id!)}
                        >
                          등록
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    className={styles.replyButton}
                    onClick={() => handleReplyClick(review.id!)}
                  >
                    답글쓰기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 이미지 미리보기 모달 */}
      {selectedImages.length > 0 && (
        <div className={styles.imageModal} onClick={closeImageModal}>
          <div
            className={styles.imageModalContent}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <button
              className={styles.imageModalClose}
              onClick={closeImageModal}
              aria-label="닫기"
            >
              ✕
            </button>

            {/* 이전 버튼 */}
            {selectedImages.length > 1 && (
              <button
                className={styles.imagePrevButton}
                onClick={goToPrevImage}
                aria-label="이전 이미지"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
            )}

            {/* 이미지 또는 동영상 */}
            {/\.(mp4|mov|avi|webm|mkv|3gp|3g2|m4v)$/i.test(selectedImages[currentImageIndex]) ? (
              <video
                src={selectedImages[currentImageIndex]}
                controls
                className={styles.imageModalImage}
                style={{ maxWidth: '70vw', maxHeight: '70vh', width: 'auto', height: 'auto' }}
              />
            ) : (
              <Image
                src={selectedImages[currentImageIndex]}
                alt={`리뷰 이미지 ${currentImageIndex + 1}`}
                width={800}
                height={800}
                className={styles.imageModalImage}
                style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              />
            )}

            {/* 다음 버튼 */}
            {selectedImages.length > 1 && (
              <button
                className={styles.imageNextButton}
                onClick={goToNextImage}
                aria-label="다음 이미지"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            )}

            {/* 이미지 인디케이터 */}
            {selectedImages.length > 1 && (
              <div className={styles.imageIndicator}>
                {currentImageIndex + 1} / {selectedImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
