'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import OptimizedImage from '@/components/common/OptimizedImage'
import styles from './ReviewWritePage.module.css'

interface OrderItem {
  productId: string
  productName: string
  productImage?: string
  options: { [key: string]: string }
  quantity: number
  price: number
}

interface Order {
  id: string
  storeId: string
  storeName: string
  items: OrderItem[]
  orderStatus: string
  deliveryDate?: string
  deliveryTime?: string
  deliveryMethod: string
  deliveryInfo?: {
    deliveryDate?: string
    deliveryTime?: string
  }
}

interface Review {
  id: string
  uid: string
  orderId: string
  storeId: string
  storeName: string
  productId: string
  rating: number
  content: string
  images: string[]
  createdAt: { toDate: () => Date } | string
}

interface ReviewEditPageProps {
  reviewId: string
}

export default function ReviewEditPage({ reviewId }: ReviewEditPageProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [review, setReview] = useState<Review | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // 날짜 포맷팅 함수 (24시간 형식)
  const formatReservationDate = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return ''

    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]

    // 시간 파싱 (HH:mm 형식)
    const [hour, minute] = timeStr.split(':').map(Number)

    return `${year}년 ${month}월 ${day}일 (${weekday}) ${hour}:${minute.toString().padStart(2, '0')}`
  }

  // 7일 이내 작성 여부 확인
  const canEdit = (createdAt: { toDate: () => Date } | string): boolean => {
    const reviewDate = typeof createdAt === 'object' && 'toDate' in createdAt
      ? createdAt
      : new Date(createdAt)
    const now = new Date()
    const diffTime = now.getTime() - reviewDate.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    return diffDays <= 7
  }

  useEffect(() => {
    const loadReview = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      if (!reviewId) {
        alert('리뷰 정보가 없습니다.')
        router.push('/reviews')
        return
      }

      try {
        // 리뷰 데이터 로드
        const reviewDoc = await getDoc(doc(db, 'reviews', reviewId))

        if (!reviewDoc.exists()) {
          alert('리뷰를 찾을 수 없습니다.')
          router.push('/reviews')
          return
        }

        const reviewData = reviewDoc.data() as Review

        if (reviewData.uid !== user.uid) {
          alert('권한이 없습니다.')
          router.push('/reviews')
          return
        }

        // 7일 이내 작성 여부 확인
        if (!canEdit(reviewData.createdAt)) {
          alert('작성한 지 7일이 지난 리뷰는 수정할 수 없습니다.')
          router.push('/reviews')
          return
        }

        setReview({ ...reviewData, id: reviewDoc.id })
        setRating(reviewData.rating)
        setContent(reviewData.content)
        setExistingImages(reviewData.images || [])

        // 주문 데이터 로드
        const orderDoc = await getDoc(doc(db, 'orders', reviewData.orderId))

        if (orderDoc.exists()) {
          const orderData = orderDoc.data()

          // 각 상품의 이미지 가져오기
          const itemsWithImages = await Promise.all(
            orderData.items.map(async (item: OrderItem) => {
              try {
                const productDoc = await getDoc(doc(db, 'products', item.productId))
                if (productDoc.exists()) {
                  const productData = productDoc.data()
                  return {
                    ...item,
                    productImage: productData.images?.[0] || ''
                  }
                }
              } catch (error) {
                console.error('제품 이미지 로딩 실패:', error)
              }
              return item
            })
          )

          setOrder({
            id: orderDoc.id,
            storeId: orderData.storeId,
            storeName: orderData.storeName,
            items: itemsWithImages,
            orderStatus: orderData.orderStatus,
            deliveryDate: orderData.deliveryDate,
            deliveryTime: orderData.deliveryTime,
            deliveryMethod: orderData.deliveryMethod,
            deliveryInfo: orderData.deliveryInfo,
          })
        }
      } catch (error) {
        console.error('리뷰 로딩 실패:', error)
        alert('리뷰 정보를 불러오는데 실패했습니다.')
        router.push('/reviews')
      } finally {
        setLoading(false)
      }
    }

    loadReview()
  }, [user, authLoading, reviewId, router])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages = Array.from(files)

    // 최대 5개까지만 허용 (기존 이미지 + 새 이미지)
    if (existingImages.length + images.length + newImages.length > 5) {
      alert('이미지는 최대 5개까지 업로드 가능합니다.')
      return
    }

    // 각 파일 크기 체크 (10MB)
    const maxSize = 10 * 1024 * 1024
    for (const file of newImages) {
      if (file.size > maxSize) {
        alert('각 이미지는 10MB 이하여야 합니다.')
        return
      }
    }

    // 이미지 미리보기 생성
    const newPreviews: string[] = []
    newImages.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === newImages.length) {
          setImagePreviews([...imagePreviews, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })

    setImages([...images, ...newImages])
  }

  const removeNewImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index))
  }

  const uploadImagesToBunny = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const file = images[i]

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'review')
      formData.append('reviewId', reviewId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('이미지 업로드 실패')
      }

      const data = await response.json()
      uploadedUrls.push(data.url)
    }

    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !review) return

    if (content.trim().length < 30) {
      alert('리뷰 내용은 30자 이상 입력해주세요.')
      return
    }

    try {
      setSubmitting(true)

      let finalImages = [...existingImages]

      // 새 이미지가 있으면 업로드
      if (images.length > 0) {
        setUploading(true)
        try {
          const newImageUrls = await uploadImagesToBunny()
          finalImages = [...existingImages, ...newImageUrls]
        } catch (uploadError) {
          console.error('이미지 업로드 실패:', uploadError)
          alert('일부 이미지 업로드에 실패했습니다.')
        } finally {
          setUploading(false)
        }
      }

      // 리뷰 업데이트
      await updateDoc(doc(db, 'reviews', reviewId), {
        rating,
        content: content.trim(),
        images: finalImages,
        updatedAt: new Date().toISOString(),
      })

      alert('리뷰가 수정되었습니다.')
      router.push('/reviews')
    } catch (error) {
      console.error('리뷰 수정 실패:', error)
      alert('리뷰 수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return <Loading />
  }

  if (!review || !order) {
    return null
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>리뷰 수정</h1>

      <div className={styles.orderInfo}>
        <div className={styles.orderItem}>
          {order.items[0]?.productImage && (
            <OptimizedImage
              src={order.items[0].productImage}
              alt={order.items[0].productName}
              width={70}
              height={70}
              className={styles.productImage}
            />
          )}
          <div className={styles.itemInfo}>
            <h2 className={styles.storeName}>{order.storeName}</h2>
            <div className={styles.productSummary}>
              {order.items[0]?.productName}
              {order.items.length > 1 && ` 외 ${order.items.reduce((sum, item) => sum + item.quantity, 0) - order.items[0].quantity}개`}
            </div>
            <div className={styles.reservationDate}>
              예약날짜 {formatReservationDate(
                order.deliveryInfo?.deliveryDate || order.deliveryDate,
                order.deliveryInfo?.deliveryTime || order.deliveryTime
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <div className={styles.ratingHeader}>
            <div className={styles.ratingTitle}>상품에 만족하셨나요?</div>
            <div className={styles.ratingSubtitle}>상품에 대한 만족도를 별점으로 남겨주세요.</div>
          </div>
          <div className={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={styles.starButton}
                onClick={() => setRating(star)}
              >
                <OptimizedImage
                  src={star <= rating ? '/icons/review_star_active.png' : '/icons/review_star.png'}
                  alt={`${star}점`}
                  width={35}
                  height={35}
                  className={styles.starImage}
                />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <div className={styles.imageUploadHeader}>
            <div className={styles.imageUploadTitle}>상품이미지를 추가해주세요</div>
            <div className={styles.imageUploadSubtitle}>구매하신 상품에 대한 이미지를 추가해주세요.</div>
          </div>

          {(existingImages.length > 0 || imagePreviews.length > 0) && (
            <div className={styles.imagePreviewContainer}>
              {/* 기존 이미지 */}
              {existingImages.map((imageUrl, index) => (
                <div key={`existing-${index}`} className={styles.imagePreviewItem}>
                  <OptimizedImage
                    src={imageUrl}
                    alt={`기존 이미지 ${index + 1}`}
                    width={100}
                    height={100}
                    className={styles.previewImage}
                  />
                  <button
                    type="button"
                    className={styles.removeImageButton}
                    onClick={() => removeExistingImage(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {/* 새 이미지 미리보기 */}
              {imagePreviews.map((preview, index) => (
                <div key={`new-${index}`} className={styles.imagePreviewItem}>
                  <OptimizedImage
                    src={preview}
                    alt={`미리보기 ${index + 1}`}
                    width={100}
                    height={100}
                    className={styles.previewImage}
                  />
                  <button
                    type="button"
                    className={styles.removeImageButton}
                    onClick={() => removeNewImage(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.imageUploadContainer}>
            <input
              type="file"
              id="imageInput"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className={styles.imageInput}
              disabled={existingImages.length + images.length >= 5}
            />
            <label
              htmlFor="imageInput"
              className={`${styles.imageUploadButton} ${existingImages.length + images.length >= 5 ? styles.disabled : ''}`}
            >
              이미지 추가
            </label>
          </div>
        </div>

        <div className={styles.formGroup}>
          <div className={styles.reviewContentHeader}>
            <div className={styles.reviewContentTitle}>상품에 리뷰를 남겨주세요!</div>
            <div className={styles.reviewContentSubtitle}>최소 30자 이상 작성해주세요.</div>
          </div>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="상품과 서비스에 대한 솔직한 평가를 남겨주세요."
            rows={5}
            required
            minLength={30}
          />
          <div className={styles.charCount}>{content.length}자</div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push('/reviews')}
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting || uploading || content.trim().length < 30}
          >
            {uploading ? '이미지 업로드 중...' : submitting ? '수정 중...' : '리뷰 수정'}
          </button>
        </div>
      </form>
    </div>
  )
}
