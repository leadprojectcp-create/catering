'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp, query, where, getDocs, limit, increment } from 'firebase/firestore'
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

export default function ReviewWritePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [mediaTypes, setMediaTypes] = useState<('image' | 'video')[]>([])

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

  useEffect(() => {
    const loadOrder = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      if (!orderId) {
        alert('주문 정보가 없습니다.')
        router.push('/orders')
        return
      }

      try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId))

        if (!orderDoc.exists()) {
          alert('주문을 찾을 수 없습니다.')
          router.push('/orders')
          return
        }

        const orderData = orderDoc.data()

        if (orderData.uid !== user.uid) {
          alert('권한이 없습니다.')
          router.push('/orders')
          return
        }

        if (orderData.orderStatus !== 'completed') {
          alert('완료된 주문만 리뷰를 작성할 수 있습니다.')
          router.push('/orders')
          return
        }

        // 이미 리뷰가 작성되었는지 확인
        const reviewsRef = collection(db, 'reviews')
        const reviewQuery = query(
          reviewsRef,
          where('uid', '==', user.uid),
          where('orderId', '==', orderId),
          limit(1)
        )
        const reviewSnapshot = await getDocs(reviewQuery)

        if (!reviewSnapshot.empty) {
          alert('이미 리뷰를 작성한 주문입니다.')
          router.push('/orders')
          return
        }

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
      } catch (error) {
        console.error('주문 로딩 실패:', error)
        alert('주문 정보를 불러오는데 실패했습니다.')
        router.push('/orders')
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [user, authLoading, orderId, router])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)

    // 최대 5개까지만 허용
    if (images.length + newFiles.length > 5) {
      alert('이미지/동영상은 최대 5개까지 업로드 가능합니다.')
      return
    }

    // 각 파일 타입 및 크기 체크
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const videoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/3gpp', 'video/3gpp2', 'video/x-m4v']
    const newMediaTypes: ('image' | 'video')[] = []

    for (const file of newFiles) {
      const isImage = imageTypes.includes(file.type)
      const isVideo = videoTypes.includes(file.type)

      if (!isImage && !isVideo) {
        alert('이미지(JPEG, PNG, GIF, WebP) 또는 동영상(MP4, MOV, AVI, WebM, MKV, 3GP) 파일만 업로드 가능합니다.')
        return
      }

      // 이미지는 10MB, 동영상은 500MB 제한
      const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        const maxSizeMB = isVideo ? 500 : 10
        alert(`${isVideo ? '동영상' : '이미지'}은 ${maxSizeMB}MB 이하여야 합니다.`)
        return
      }

      newMediaTypes.push(isVideo ? 'video' : 'image')
    }

    // 미리보기 생성
    const newPreviews: string[] = []
    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === newFiles.length) {
          setImagePreviews([...imagePreviews, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })

    setImages([...images, ...newFiles])
    setMediaTypes([...mediaTypes, ...newMediaTypes])
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
    setMediaTypes(mediaTypes.filter((_, i) => i !== index))
  }

  const uploadImagesToBunny = async (reviewId: string): Promise<string[]> => {
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('파일 업로드 실패:', errorData)
        throw new Error(`파일 업로드 실패: ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      uploadedUrls.push(data.url)
    }

    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !order) return

    if (content.trim().length < 30) {
      alert('리뷰 내용은 30자 이상 입력해주세요.')
      return
    }

    try {
      setSubmitting(true)

      // 먼저 리뷰 문서 생성
      const reviewRef = await addDoc(collection(db, 'reviews'), {
        uid: user.uid,
        orderId: order.id,
        storeId: order.storeId,
        storeName: order.storeName,
        productId: order.items[0]?.productId || '',
        rating,
        content: content.trim(),
        images: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      let hasImages = false

      // 이미지가 있으면 업로드
      if (images.length > 0) {
        setUploading(true)
        try {
          const imageUrls = await uploadImagesToBunny(reviewRef.id)

          // 리뷰 문서에 이미지 URL 추가
          await updateDoc(doc(db, 'reviews', reviewRef.id), {
            images: imageUrls,
            updatedAt: serverTimestamp(),
          })
          hasImages = true
        } catch (uploadError) {
          console.error('파일 업로드 실패:', uploadError)
          alert('리뷰는 등록되었으나 일부 파일 업로드에 실패했습니다.')
        } finally {
          setUploading(false)
        }
      }

      // 포인트 지급
      const pointAmount = hasImages ? 1000 : 500
      const pointReason = hasImages ? '포토 리뷰 작성' : '리뷰 작성'

      try {
        // users 컬렉션의 point 필드 업데이트
        const userRef = doc(db, 'users', user.uid)
        await updateDoc(userRef, {
          point: increment(pointAmount)
        })

        // points 컬렉션에 포인트 적립 내역 저장
        await addDoc(collection(db, 'points'), {
          uid: user.uid,
          amount: pointAmount,
          type: 'earned',
          reason: pointReason,
          reviewId: reviewRef.id,
          orderId: order.id,
          productId: order.items[0]?.productId || '',
          productName: order.items[0]?.productName || '',
          createdAt: serverTimestamp()
        })

        alert(`리뷰가 등록되었습니다. ${pointAmount}포인트가 적립되었습니다!`)
      } catch (pointError) {
        console.error('포인트 지급 실패:', pointError)
        alert('리뷰는 등록되었으나 포인트 지급에 실패했습니다.')
      }

      router.push('/orders')
    } catch (error) {
      console.error('리뷰 등록 실패:', error)
      alert('리뷰 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return <Loading />
  }

  if (!order) {
    return null
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>리뷰 작성</h1>

      <div className={styles.orderInfo}>
        <div className={styles.orderItem}>
          {order.items[0]?.productImage && (
            <div className={styles.productImageWrapper}>
              <OptimizedImage
                src={order.items[0].productImage}
                alt={order.items[0].productName}
                fill
                className={styles.productImage}
              />
            </div>
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
            <div className={styles.imageUploadTitle}>상품이미지/동영상을 추가해주세요</div>
            <div className={styles.imageUploadSubtitle}>구매하신 상품에 대한 이미지 또는 동영상을 추가해주세요.</div>
          </div>

          {imagePreviews.length > 0 && (
            <div className={styles.imagePreviewContainer}>
              {imagePreviews.map((preview, index) => (
                <div key={index} className={styles.imagePreviewItem}>
                  {mediaTypes[index] === 'video' ? (
                    <video
                      src={preview}
                      className={styles.previewImage}
                      controls
                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    />
                  ) : (
                    <OptimizedImage
                      src={preview}
                      alt={`미리보기 ${index + 1}`}
                      width={100}
                      height={100}
                      className={styles.previewImage}
                    />
                  )}
                  <button
                    type="button"
                    className={styles.removeImageButton}
                    onClick={() => removeImage(index)}
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
              accept="image/*,video/*"
              multiple
              onChange={handleImageSelect}
              className={styles.imageInput}
              disabled={images.length >= 5}
            />
            <label
              htmlFor="imageInput"
              className={`${styles.imageUploadButton} ${images.length >= 5 ? styles.disabled : ''}`}
            >
              이미지/동영상 추가
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
            onClick={() => router.push('/orders')}
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting || uploading || content.trim().length < 30}
          >
            {uploading ? '파일 업로드 중...' : submitting ? '등록 중...' : '리뷰 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
