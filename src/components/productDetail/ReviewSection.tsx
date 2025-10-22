'use client'

import Image from 'next/image'
import { Review } from './ProductDetailPage'
import styles from './ReviewSection.module.css'

interface ReviewSectionProps {
  reviews: Review[]
  loadingReviews: boolean
}

export default function ReviewSection({ reviews, loadingReviews }: ReviewSectionProps) {
  return (
    <div className={styles.reviewSection}>
      <h3 className={styles.reviewTitle}>리뷰 ({reviews.length})</h3>
      {loadingReviews ? (
        <div className={styles.reviewLoading}>리뷰를 불러오는 중...</div>
      ) : reviews.length === 0 ? (
        <div className={styles.reviewEmpty}>아직 작성된 리뷰가 없습니다.</div>
      ) : (
        <div className={styles.reviewList}>
          {reviews.map((review) => (
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
              <p className={styles.reviewContent}>{review.content}</p>
              {review.images && review.images.length > 0 && (
                <div className={styles.reviewImages}>
                  {review.images.map((imageUrl, index) => (
                    <div key={index} className={styles.reviewImageItem}>
                      <Image
                        src={imageUrl}
                        alt={`리뷰 이미지 ${index + 1}`}
                        width={100}
                        height={100}
                        className={styles.reviewImage}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
